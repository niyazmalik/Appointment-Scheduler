import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment } from './appointment.entity';

export enum SlotMode {
  STREAM = 'stream',
  WAVE = 'wave',
}

export enum Weekday {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

@Entity('slots')
export class Slot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.slots)
  doctor: Doctor;

  @Column({type: 'enum', enum: Weekday})
  day: Weekday; 

  @Column()
  startTime: string; 

  @Column()
  endTime: string; 

  @Column({type: 'enum', enum: SlotMode})
  mode: SlotMode;

  @Column({ nullable: true })
  maxBookings?: number;

  @OneToMany(() => Appointment, (appt) => appt.slot)
  appointments: Appointment[];
}