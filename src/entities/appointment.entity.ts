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
  description: string;

  @Column({
  type: 'enum',
  enum: ['confirmed', 'cancelled', 'rescheduled'],
  default: 'confirmed',
  })
  status: 'confirmed' | 'cancelled' | 'rescheduled';


  @Column({ name: 'created_at', nullable: true })
  created_at: Date;
}