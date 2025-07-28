import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Slot } from '../entities/slot.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from '../entities/session.entity';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) { }

  async getAllDoctors(search = '', page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.doctorRepo.findAndCount({
      where: [
        { user: { name: ILike(`%${search}%`) } },
        { user: { email: ILike(`%${search}%`) } },
        { user: { phone_number: ILike(`%${search}%`) } },
      ],
      relations: ['user'],
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDoctorById(id: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { id },
      relations: ['user', 'slots'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const session = this.sessionRepo.create({
      ...dto,
      doctor,
    });

    const saved = await this.sessionRepo.save(session);

    return {
      id: saved.id,
      day: saved.day,
      start_time: saved.consult_start_time,
      end_time: saved.consult_end_time,
    };
  }

  async createSlotInSession(userId: string, sessionId: string, dto: CreateSlotDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['doctor'],
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.doctor.id !== doctor.id)
      throw new ForbiddenException('You are not authorized to add slot to this session');

    const toTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return new Date(0, 0, 0, h, m);
    };

    const slotStart = toTime(dto.start_time);
    const slotEnd = toTime(dto.end_time);
    const sessionStart = toTime(session.consult_start_time);
    const sessionEnd = toTime(session.consult_end_time);

    if (slotStart >= slotEnd) {
      throw new BadRequestException('Slot start time must be before end time');
    }

    // Within session time?
    if (slotStart < sessionStart || slotEnd > sessionEnd) {
      throw new BadRequestException('Slot timing must lie within session timing');
    }

    // Overlapping check
    const existingSlots = await this.slotRepo.find({
      where: { session: { id: session.id } },
    });

    const overlaps = existingSlots.some((slot) => {
      const sStart = toTime(slot.start_time);
      const sEnd = toTime(slot.end_time);
      return slotStart < sEnd && slotEnd > sStart;
    });

    if (overlaps) {
      throw new BadRequestException('Slot overlaps with an existing slot in this session');
    }

    const slot = this.slotRepo.create({
      ...dto,
      session,
      doctor,
    });

    await this.slotRepo.save(slot);

    return {
      message: 'Slot created successfully',
      data: {
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        avg_consult_time: slot.avg_consult_time,
        max_bookings: slot.max_bookings,
      },
    };
  }

  async updateSession(
    doctorUserId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['doctor', 'slots', 'slots.appointments'],
    });

    if (!session) throw new NotFoundException('Session not found');

    if (session.doctor.user.id !== doctorUserId) {
      throw new ForbiddenException('Unauthorized to update this session');
    }

    const originalStart = session.consult_start_time;
    const originalEnd = session.consult_end_time;

    const newStart = dto.consult_start_time || originalStart;
    const newEnd = dto.consult_end_time || originalEnd;

    if (newStart >= newEnd) {
      throw new BadRequestException('start_time must be before end_time');
    }

    const startChanged = dto.consult_start_time && dto.consult_start_time!== originalStart;
    const endChanged = dto.consult_end_time && dto.consult_end_time !== originalEnd;

    // Handling different scenarios...
    if (startChanged) {
      await this.handleStartTimeShrinkOrExpand(session, newStart);
    }

    if (endChanged) {
      await this.handleEndTimeShrinkOrExpand(session, newEnd);
    }

    // Now update
    session.consult_start_time = newStart;
    session.consult_end_time = newEnd;

    const updated = await this.sessionRepo.save(session);

    return {
      message: 'Session updated successfully',
      data: {
        id: updated.id,
        start_time: updated.consult_start_time,
        end_time: updated.consult_end_time,
      },
    };
  }

  private async handleStartTimeShrinkOrExpand(session: Session, newStartTime: string) {
    for (const slot of session.slots) {
      if (slot.start_time < newStartTime) {
        if (slot.appointments.length > 0) {
          throw new ConflictException(
            `Cannot shrink start_time. Slot from ${slot.start_time} to ${slot.end_time} has bookings`
          );
        }
      }
    }

    // Optionally delete or archive affected slots
    await this.slotRepo.remove(
      session.slots.filter(slot => slot.start_time < newStartTime && slot.appointments.length === 0)
    );
  }

  private async handleEndTimeShrinkOrExpand(session: Session, newEndTime: string) {
    for (const slot of session.slots) {
      if (slot.end_time > newEndTime) {
        if (slot.appointments.length > 0) {
          throw new ConflictException(
            `Cannot shrink end_time. Slot from ${slot.start_time} to ${slot.end_time} has bookings`
          );
        }
      }
    }

    // Delete or cleanup slots beyond new end_time
    await this.slotRepo.remove(
      session.slots.filter(slot => slot.end_time > newEndTime && slot.appointments.length === 0)
    );
  }
}