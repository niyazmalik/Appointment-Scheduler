import { Entity, PrimaryGeneratedColumn, JoinColumn, OneToOne, Column, OneToMany} from 'typeorm';
import {User} from './user.entity';
import { Appointment } from './appointment.entity';


@Entity('patients')
export class Patient {

    @PrimaryGeneratedColumn('uuid')
    id: string

    @OneToOne(()=> User, user => user.patientProfile)
    @JoinColumn()
    user: User
    
    @Column({nullable: true})
    age: number

    @Column({nullable: true})
    gender: 'MALE' | 'FEMALE'

    @Column({nullable: true})
    address: string

    @OneToMany(() => Appointment, (appointment) => appointment.patient)
    appointments: Appointment[];
}