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

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'enum', enum: DayOfWeek, enumName: 'session_day' })
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

  @OneToMany(() => Slot, (slot) => slot.session, { cascade: true })
  slots: Slot[];
}
