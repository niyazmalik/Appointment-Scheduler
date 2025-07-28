import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment } from './appointment.entity';
import { Session } from './session.entity';

@Entity('slots')
export class Slot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session, (session) => session.slots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Session;
  
  @ManyToOne(() => Doctor, (doctor) => doctor.slots)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ default: false })
  is_booked: boolean;

  @Column({ type: 'int', default: 10 })
  avg_consult_time: number;

  @Column({ type: 'int', default: 1 })
  max_bookings: number;

  @OneToMany(() => Appointment, (appointment) => appointment.slot)
  appointments: Appointment[];
}
