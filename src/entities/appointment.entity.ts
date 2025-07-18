import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Slot } from './slot.entity';
import { Patient } from './patient.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Slot, (slot) => slot.appointments)
  slot: Slot;

  @ManyToOne(() => Patient, (patient) => patient.appointments)
  patient: Patient;

  @Column()
  reason: string;

  @Column({ default: 'confirmed' })
  status: 'confirmed' | 'cancelled' | 'rescheduled';

  @Column({ nullable: true })
  createdAt: Date;
}