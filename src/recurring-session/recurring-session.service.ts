import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringSession } from 'src/entities/recurring-session.entity';
import { Session } from 'src/entities/session.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { DayOfWeek } from 'src/enums/day.enum';
import dayjs from 'dayjs';

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

  async generateSessions(daysAhead: number, userId: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found for this user');
    }

    const today = dayjs();
    const end = today.add(daysAhead, 'day');

    const recurring = await this.recurringRepo.find({
      where: {
        is_active: true,
        doctor: { id: doctor.id },
      },
      relations: ['doctor'],
    });

    for (const rule of recurring) {
      for (let d = today; d.isBefore(end); d = d.add(1, 'day')) {
        const dayFound = DayOfWeek[d.format('dddd').toUpperCase() as keyof typeof DayOfWeek];
        if (dayFound !== rule.day) continue;

        const sessionDate = d.format('YYYY-MM-DD');

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
            consult_start_time: rule.consult_start_time,
            consult_end_time: rule.consult_end_time,
            doctor: rule.doctor,
            recurring_template: rule,
          });
          await this.sessionRepo.save(session);
        }
      }
    }
  }
}
