import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Slot, Weekday } from 'src/entities/slot.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

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

  async createSlot(userId: string, dto: CreateSlotDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // Check for overlapping slot
    const existingSlot = await this.slotRepo
      .createQueryBuilder('slot')
      .where('slot.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('slot.day = :day', { day: dto.day })
      .andWhere(
        '(slot.start_time < :end_time AND slot.end_time > :start_time)',
        {
          start_time: dto.start_time,
          end_time: dto.end_time,
        },
      )
      .getOne();

    if (existingSlot) {
      throw new BadRequestException('Overlapping slot already exists for this day/time');
    }

    const slot = this.slotRepo.create({ ...dto, doctor });
    return this.slotRepo.save(slot);
  }

  async getDoctorSlots(doctorId: string, day?: Weekday) {
    const where: any = {
      doctor: { id: doctorId }
    };

    if (day) where.day = day.toLowerCase();

    return this.slotRepo.find({
      where,
      order: {
        day: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  async getOwnSlotsByUserId(userId: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');
    return this.getDoctorSlots(doctor.id);
  }

  async getSlotById(id: string) {
    const slot = await this.slotRepo.findOne({
      where: { id },
      relations: ['doctor', 'doctor.user'],
    });
    if (!slot) throw new NotFoundException('Slot not found');
    return slot;
  }

  async updateSlot(id: string, dto: UpdateSlotDto) {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');

    Object.assign(slot, dto);
    return this.slotRepo.save(slot);
  }

  async deleteSlot(id: string) {
    const slot = await this.slotRepo.findOne({ where: { id } });
    if (!slot) throw new NotFoundException('Slot not found');
    await this.slotRepo.remove(slot);
    return { message: 'Slot deleted successfully' };
  }
}
