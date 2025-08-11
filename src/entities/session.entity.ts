import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Slot } from './slot.entity';
import { DayOfWeek } from 'src/enums/day.enum';
import { RecurringSession } from './recurring-session.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'date' })
  session_date: string;

  @Column({ type: 'enum', enum: DayOfWeek, enumName: 'session_day' })
  day: DayOfWeek;

  @Column({ type: 'time' })
  consult_start_time: string;

  @Column({ type: 'time' })
  consult_end_time: string;

  @Column({ type: 'time' })
  booking_start_time: string;

  @Column({ type: 'int', default: 10 })
  avg_consult_time: number;

  @Column({ type: 'int', nullable: false })
  slot_duration: number; // in minutes

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToOne(() => RecurringSession, { nullable: true, onDelete: 'SET NULL' })
  recurring_template: RecurringSession;

  @OneToMany(() => Slot, (slot) => slot.session, { cascade: true })
  slots: Slot[];
}
