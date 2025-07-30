import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Patient } from './patient.entity';
import { Slot } from './slot.entity';

export enum AppointmentStatus {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled',
  MISSED = 'missed',
  PENDING_RESCHEDULE = 'pending_reschedule',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToOne(() => Slot, (slot) => slot.appointments)
  @JoinColumn({ name: 'slot_id' }) 
  slot: Slot;

  @Column({ type: 'enum', enum: AppointmentStatus, default: AppointmentStatus.CONFIRMED })
  status: AppointmentStatus;

  @Column({ nullable: true })
  appointment_reason: string;

  @Column({ nullable: true })
  cancellation_reason: string;

  @Column({ type: 'time', nullable: true })
  reporting_time: string;

  @CreateDateColumn()
  created_at: Date;
}
