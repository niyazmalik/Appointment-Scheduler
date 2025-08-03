import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Slot } from '../entities/slot.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from '../entities/session.entity';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Appointment, AppointmentStatus } from 'src/entities/appointment.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
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
        avg_consult_time: session.avg_consult_time,
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

    const startChanged = dto.consult_start_time && dto.consult_start_time !== originalStart;
    const endChanged = dto.consult_end_time && dto.consult_end_time !== originalEnd;

    const { consult_start_time, consult_end_time } = dto;

    if (consult_start_time && consult_end_time && consult_start_time >= consult_end_time) {
      throw new BadRequestException('Start time must be before end time.');
    }

    // Handling different scenarios...
    if (startChanged) {
      await this.handleStartTimeShrinkOrExpand(session, newStart);
    }

    if (endChanged) {
      await this.handleEndTimeShrinkOrExpand(session, newEnd);
    }

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
    const { isShrink, newStart, originalStart, currentTime } = this.getContextForStartShrink(session, newStartTime);

    if (!isShrink) {
      return {
        message: 'Session start time expanded. You may add new slots before this time.',
      };
    }

    const { affectedAppointments, slotsToDelete } = this.extractAffectedAppointmentsAndDeletableSlotsFromStart(
      session,
      newStart,
      originalStart);

    await this.slotRepo.remove(slotsToDelete);

    if (affectedAppointments.length === 0) {
      return { message: 'Successfully deleted the slots!' };
    }

    const isDoctorShrinkingDuringBooking = this.isDoctorShrinkingDuringBooking(session, currentTime);

    if (isDoctorShrinkingDuringBooking) {

    }

    const remainingSlotsForAdjust = this.getRemainingSlotsForAdjustmentForStartShrink(session, newStart);

    const adjusted: Appointment[] = [];
    const pending: Appointment[] = [];

    const bookingCountMap = new Map<string, number>();

    for (const appointment of affectedAppointments) {
      const availableSlot = this.getAvailableSlotForStartShrink(remainingSlotsForAdjust, bookingCountMap);

      if (availableSlot) {
        const existingBookings = availableSlot.appointments.length;
        const adjustedCount = bookingCountMap.get(availableSlot.id) || 0;
        const totalBookings = existingBookings + adjustedCount;

        if (totalBookings + 1 === availableSlot.max_bookings) {
          await this.slotRepo.update(availableSlot.id, { is_booked: true });
        }

        appointment.slot = availableSlot;
        adjusted.push(appointment);
        appointment.reporting_time = this.calculateReportingTime(
          availableSlot.start_time,
          session.avg_consult_time,
          totalBookings
        );
        bookingCountMap.set(availableSlot.id, adjustedCount + 1);

      } else {
        appointment.status = AppointmentStatus.PENDING_RESCHEDULE;
        pending.push(appointment);
      }
    }
    await this.appointmentRepo.save([...adjusted, ...pending]);
    return {
      adjusted: adjusted.map(a => a.id),
      pending: pending.map(a => a.id),
      message: `Adjusted ${adjusted.length} appointments, ${pending.length} require manual reschedule.`,
    };
  }

  private async handleEndTimeShrinkOrExpand(session: Session, newEndTime: string) {
    const { originalEnd, newEnd, isShrink, currentTime } = this.getContextForEndShrink(session, newEndTime);

    if (!isShrink) {
      return {
        message: 'Session end time extended. New slots can now be added as needed.',
      };
    }

    const { affectedAppointments, slotsToDelete } = this.extractAffectedAppointmentsAndDeletableSlotsFromEnd(
      session,
      newEnd,
      originalEnd,
    );

    await this.slotRepo.remove(slotsToDelete);

    if (affectedAppointments.length === 0) {
      return { message: 'Successfully deleted the slots!' };
    }

    const validSlotsForAdjust = this.getValidSlotsForAdjustmentForEndShrink(session, newEnd, currentTime);
    const bookingCountMap = new Map<string, number>();
    const slotsToUpdate = new Set<Slot>();
    const adjusted: Appointment[] = [];
    const pending: Appointment[] = [];

    const isDoctorShrinkingDuringBooking = this.isDoctorShrinkingDuringBooking(session, currentTime);

    if (isDoctorShrinkingDuringBooking) {
      const consultStartTime = getTodayDateTime(session.consult_start_time);
      const totalAvailableMinutes = this.getTotalAvailableMinutes(consultStartTime, newEnd);
      const bookedAppointments = this.getBookedAppointments(session);

      const totalAppointments = bookedAppointments.length;
      const totalMaxBookings = this.getTotalMaxBookings(session);

      if (totalAppointments === totalMaxBookings) {
        return await this.handleFullyBookedCaseForEndShrink(
          bookedAppointments,
          consultStartTime,
          totalAvailableMinutes,
        );
      }
      await this.handlePartialBookedCaseForEndShrink(
        session,
        affectedAppointments,
        validSlotsForAdjust,
        slotsToUpdate,
        bookingCountMap,
        adjusted,
        pending
      );

      if (pending.length > 0) {
        return await this.handleFullyBookedCaseForEndShrink(
          pending,
          consultStartTime,
          totalAvailableMinutes
        );
      }

      return {
        adjusted: adjusted.map(a => a.id),
        message: `All appointments adjusted successfully.`,
      };
    }

    for (const appointment of affectedAppointments) {
      const availableSlot = this.findAvailableSlotForAppointmentForEndShrink(validSlotsForAdjust, currentTime, bookingCountMap);

      if (availableSlot) {
        const existingBookings = availableSlot.appointments.length;
        const adjustedCount = bookingCountMap.get(availableSlot.id) || 0;
        const totalBookings = existingBookings + adjustedCount;

        if (totalBookings + 1 === availableSlot.max_bookings) {
          availableSlot.is_booked = true;
          slotsToUpdate.add(availableSlot);
        }

        appointment.slot = availableSlot;
        appointment.reporting_time = this.calculateReportingTime(
          availableSlot.start_time,
          session.avg_consult_time,
          totalBookings
        );
        adjusted.push(appointment);
        bookingCountMap.set(availableSlot.id, adjustedCount + 1);

      } else {
        appointment.status = AppointmentStatus.PENDING_RESCHEDULE;
        pending.push(appointment);
      }
    }

    await this.slotRepo.save([...slotsToUpdate]);
    await this.appointmentRepo.save([...adjusted, ...pending]);

    return {
      adjusted: adjusted.map(a => a.id),
      pending: pending.map(a => a.id),
      message: `Adjusted ${adjusted.length} appointments, ${pending.length} require manual reschedule.`,
    };
  }

  private getTotalAvailableMinutes(start: Date, end: Date): number {
    return (end.getTime() - start.getTime()) / (60 * 1000);
  }

  private getBookedAppointments(session: Session): Appointment[] {
    return session.slots
      .flatMap(slot => slot.appointments)
      .filter(app => app.status === AppointmentStatus.CONFIRMED);
  }

  private getTotalMaxBookings(session: Session): number {
    return session.slots.reduce((sum, slot) => sum + slot.max_bookings, 0);
  }

  private calculateReportingTime(slotStartTime: string, avgConsultTime: number, totalBookings: number): string {
    const reportingTimeDate = getTodayDateTime(slotStartTime);
    reportingTimeDate.setMinutes(
      reportingTimeDate.getMinutes() + totalBookings * avgConsultTime
    );

    return reportingTimeDate.toTimeString().slice(0, 5);
  }

  private isDoctorShrinkingDuringBooking(session: Session, currentTime: Date): boolean {
    const bookingStart = getTodayDateTime(session.booking_start_time);
    const consultStart = getTodayDateTime(session.consult_start_time);
    const bufferBeforeConsult = new Date(consultStart.getTime() - 2 * 60 * 60 * 1000); // 2 hours before consult

    return currentTime >= bookingStart && currentTime <= bufferBeforeConsult;
  }

  private async handleFullyBookedCaseForEndShrink(
    bookedAppointments: Appointment[],
    consultStartTime: Date,
    totalAvailableMinutes: number,
  ) {
    const totalAppointments = bookedAppointments.length;
    const maxAppointmentsPossible = Math.floor(totalAvailableMinutes / 5);

    if (maxAppointmentsPossible >= totalAppointments) {
      const dynamicConsultTime = Math.floor(totalAvailableMinutes / totalAppointments);

      for (let i = 0; i < totalAppointments; i++) {
        const app = bookedAppointments[i];
        const newReportingTime = new Date(
          consultStartTime.getTime() + i * dynamicConsultTime * 60 * 1000,
        );
        app.reporting_time = newReportingTime.toTimeString().slice(0, 5);
      }

      await this.appointmentRepo.save(bookedAppointments);
      return {
        message: 'All appointments adjusted with reduced consult time.',
      };
    } else {
      const adjustable = bookedAppointments.slice(0, maxAppointmentsPossible);
      const unfitAppointments = bookedAppointments.slice(maxAppointmentsPossible);

      for (let i = 0; i < adjustable.length; i++) {
        const app = adjustable[i];
        const newReportingTime = new Date(
          consultStartTime.getTime() + i * 5 * 60 * 1000,
        );
        app.reporting_time = newReportingTime.toTimeString().slice(0, 5);
      }

      unfitAppointments.forEach(a => (a.status = AppointmentStatus.PENDING_RESCHEDULE));

      const allAppointmentsToSave = [...adjustable, ...unfitAppointments];
      await this.appointmentRepo.save(allAppointmentsToSave);
      return {
        message: `Only ${maxAppointmentsPossible} appointments could be adjusted. ${unfitAppointments.length} need manual reschedule.`,
        reschedule_required: unfitAppointments.map(a => a.id),
      };
    }
  }

  private async handlePartialBookedCaseForEndShrink(
    session: Session,
    affectedAppointments: Appointment[],
    validSlotsForAdjust: Slot[],
    slotsToUpdate: Set<Slot>,
    bookingCountMap: Map<string, number>,
    adjusted: Appointment[],
    pending: Appointment[]
  ) {

    let slotIndex = validSlotsForAdjust.length - 1;

    for (const appointment of affectedAppointments.reverse()) {
      while (slotIndex >= 0) {
        const slot = validSlotsForAdjust[slotIndex];
        const adjustedCount = bookingCountMap.get(slot.id) || 0;
        const totalBookings = slot.appointments.length + adjustedCount;

        if (totalBookings < slot.max_bookings) {
          appointment.slot = slot;
          appointment.reporting_time = this.calculateReportingTime(
            slot.start_time,
            session.avg_consult_time,
            totalBookings,
          );
          bookingCountMap.set(slot.id, adjustedCount + 1);
          adjusted.push(appointment);

          if (totalBookings + 1 === slot.max_bookings) {
            slot.is_booked = true;
            slotsToUpdate.add(slot);
          }
          break;
        } else {
          slotIndex--;
        }
      }

      if (!appointment.slot) {
        pending.push(appointment);
      }
    }
    await this.slotRepo.save([...slotsToUpdate]);
    await this.appointmentRepo.save([...adjusted, ...pending]);
  }

  private getValidSlotsForAdjustmentForEndShrink(session: Session, newEnd: Date, currentTime: Date): Slot[] {
    const consultStart = getTodayDateTime(session.consult_start_time);

    return session.slots.filter(slot => {
      const slotStart = getTodayDateTime(slot.start_time);
      const isWithinNewWindow = slotStart >= consultStart && slotStart < newEnd;
      const isNotAttendedYet = slotStart >= currentTime;
      return isWithinNewWindow && isNotAttendedYet;
    });
  }

  private getRemainingSlotsForAdjustmentForStartShrink(session: Session, newStart: Date): Slot[] {
    return session.slots.filter(
      slot => getTodayDateTime(slot.start_time) >= newStart
    );
  }

  private findAvailableSlotForAppointmentForEndShrink(validSlots: Slot[], currentTime: Date, bookingMap: Map<string, number>): Slot | undefined {
    return validSlots.find(slot => {
      const slotStart = getTodayDateTime(slot.start_time);
      const isAfterBuffer = slotStart.getTime() - currentTime.getTime() >= 60 * 60 * 1000;

      const adjustedCount = bookingMap.get(slot.id) || 0;
      const totalBookings = slot.appointments.length + adjustedCount;

      const hasSpace = totalBookings < slot.max_bookings;
      return hasSpace && isAfterBuffer;
    });
  }

  private getAvailableSlotForStartShrink(remainingSlots: Slot[], bookingCountMap: Map<string, number>): Slot | undefined {
    return remainingSlots.find(slot => {
      const adjustedCount = bookingCountMap.get(slot.id) || 0;
      return slot.appointments.length + adjustedCount < slot.max_bookings;
    });
  }

  private extractAffectedAppointmentsAndDeletableSlotsFromEnd(session: Session, newEnd: Date, originalEnd: Date): { affectedAppointments: Appointment[]; slotsToDelete: Slot[] } {
    const affectedAppointments: Appointment[] = [];
    const slotsToDelete: Slot[] = [];

    for (let i = session.slots.length - 1; i >= 0; i--) {
      const slot = session.slots[i];
      const slotStart = getTodayDateTime(slot.start_time);
      const slotEnd = getTodayDateTime(slot.end_time);

      if (slotStart < newEnd && slotEnd > newEnd && slotEnd <= originalEnd) {
        const affected = slot.appointments.filter(app => {
          const reportingTime = getTodayDateTime(app.reporting_time);
          return reportingTime > newEnd;
        });

        affectedAppointments.push(...affected);
        break;
      }

      else if (slotStart >= newEnd && slotStart < originalEnd) {
        if (slot.appointments.length === 0) {
          slotsToDelete.push(slot);
        } else {
          affectedAppointments.push(...slot.appointments);
        }
      }

      else {
        break;
      }
    }
    return { affectedAppointments, slotsToDelete };
  }

  private extractAffectedAppointmentsAndDeletableSlotsFromStart(session: Session, newStart: Date, originalStart: Date,): { affectedAppointments: Appointment[]; slotsToDelete: Slot[] } {
    const affectedAppointments: Appointment[] = [];
    const slotsToDelete: Slot[] = [];

    for (let i = 0; i < session.slots.length; i++) {
      const slot = session.slots[i];
      const slotStart = getTodayDateTime(slot.start_time);
      const slotEnd = getTodayDateTime(slot.end_time);

      if (slotEnd > newStart && slotStart < newStart && slotStart >= originalStart) {
        const affected = slot.appointments.filter(app => {
          const reportingTime = getTodayDateTime(app.reporting_time);
          return reportingTime < newStart;
        });
        affectedAppointments.push(...affected);
        break;
      } else if (slotEnd <= newStart && slotEnd > originalStart) {
        if (slot.appointments.length === 0) {
          slotsToDelete.push(slot);
        } else {
          affectedAppointments.push(...slot.appointments);
        }
      } else {
        break;
      }
    }

    return { affectedAppointments, slotsToDelete };
  }

  private getContextForEndShrink(session: Session, newEndTime: string) {
    const originalEnd = getTodayDateTime(session.consult_end_time);
    const newEnd = getTodayDateTime(newEndTime);
    const isShrink = newEnd < originalEnd;
    const currentTime = new Date();

    return { originalEnd, newEnd, isShrink, currentTime };
  }

  private getContextForStartShrink(session: Session, newStartTime: string) {
    const originalStartTime = session.consult_start_time;
    const newStart = getTodayDateTime(newStartTime);
    const originalStart = getTodayDateTime(originalStartTime);
    const currentTime = new Date();

    const isShrink = newStart > originalStart;
    return { isShrink, newStart, originalStart, currentTime };
  }
}

function getTodayDateTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
}