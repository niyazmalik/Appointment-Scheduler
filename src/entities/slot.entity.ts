import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment } from './appointment.entity';

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
  start_time: string; 

  @Column()
  end_time: string;

  @Column({nullable: true })
  cancel_before_hours: number;
  
  @Column({ default: false })
  is_booked: boolean;

  @Column({ nullable: true })
  max_bookings?: number;

  @OneToMany(() => Appointment, (appointment) => appointment.slot)
  appointments: Appointment[];
}