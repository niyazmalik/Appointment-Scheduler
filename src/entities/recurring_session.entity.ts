import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Session } from './session.entity';
import { DayOfWeek } from 'src/enums/day.enum';

@Entity('recurring_sessions')
export class RecurringSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.recurring_sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'enum', enum: DayOfWeek, enumName: 'day_of_week' })
  day: DayOfWeek;

  @Column({ type: 'time' })
  consult_start_time: string;

  @Column({ type: 'time' })
  consult_end_time: string;

  @Column({ type: 'time' })
  booking_start_time: string;

  @Column({ type: 'time' })
  booking_end_time: string;

  @Column({ type: 'int', default: 10 })
  avg_consult_time: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @OneToMany(() => Session, (session) => session.recurring_session)
  sessions: Session[];
}
