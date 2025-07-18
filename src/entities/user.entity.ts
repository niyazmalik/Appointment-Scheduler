import {Entity, PrimaryGeneratedColumn, Column, OneToOne} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';

@Entity('users')
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({unique: true})
    email: string;

    @Column({unique: true})
    phone_number: string;

    @Column()
    password: string;

    @Column({ type: "enum", enum: ['doctor', 'patient']})
    role: 'doctor' | 'patient';

    @OneToOne(() => Doctor, doctor => doctor.user, {cascade:true, nullable:true})
    doctorProfile: Doctor;

    @OneToOne(() => Patient, patient => patient.user, {cascade: true, nullable:true})
    patientProfile: Patient

}