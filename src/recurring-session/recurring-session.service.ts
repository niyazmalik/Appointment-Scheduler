import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringSession } from 'src/entities/recurring-session.entity';
import { Session } from 'src/entities/session.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { DayOfWeek } from 'src/enums/day.enum';
import { CreateRecurringSessionDto } from './create-recurring-session.dto';

@Injectable()
export class RecurringSessionService {
  constructor(
    @InjectRepository(RecurringSession)
    private readonly recurringRepo: Repository<RecurringSession>,

    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>
  ) { }

  async create(userId: string, dto: CreateRecurringSessionDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found for this user');
    }

    const existing = await this.recurringRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        day: dto.day,
        consult_start_time: dto.consult_start_time,
        consult_end_time: dto.consult_end_time,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Recurring template already exists for ${dto.day} with same time range`,
      );
    }

    const recurring = this.recurringRepo.create({
      ...dto,
      doctor,
      is_active: true,
    });

    return this.recurringRepo.save(recurring);
  }

  async generateSessions(daysAhead: number, userId: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found for this user');
    }

    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(Date.now() + istOffset);
    const endIST = new Date(todayIST.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const recurring = await this.recurringRepo.find({
      where: {
        is_active: true,
        doctor: { id: doctor.id },
      },
      relations: ['doctor'],
    });

    if (!recurring.length) {
      throw new NotFoundException('No active recurring templates found for this doctor');
    }

    const createdSessions: string[] = [];
    const skippedSessions: string[] = [];

    for (const rule of recurring) {
      for (
        let d = new Date(todayIST);
        d < endIST;
        d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
      ) {
        const dayFound =
          DayOfWeek[d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() as keyof typeof DayOfWeek];

        if (dayFound !== rule.day) continue;

        const sessionDate = d.toISOString().split('T')[0];

        const exists = await this.sessionRepo.findOne({
          where: {
            session_date: sessionDate,
            doctor: { id: rule.doctor.id },
            recurring_template: { id: rule.id },
          },
        });

        if (!exists) {
          const session = this.sessionRepo.create({
            session_date: sessionDate,
            day: rule.day,
            consult_start_time: rule.consult_start_time,
            consult_end_time: rule.consult_end_time,
            booking_start_time: rule.booking_start_time,
            slot_duration: rule.slot_duration,
            doctor: rule.doctor,
            recurring_template: rule,
          });
          await this.sessionRepo.save(session);
          createdSessions.push(sessionDate);
        } else {
          skippedSessions.push(sessionDate);
        }
      }
    }
    return {
      message: 'Session generation completed',
      createdCount: createdSessions.length,
      skippedCount: skippedSessions.length,
      createdDates: createdSessions,
      skippedDates: skippedSessions,
    };
  }
}
