import {Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany} from 'typeorm';
import {User} from './user.entity';
import { Slot } from './slot.entity';

@Entity('doctors')
export class Doctor{
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(()=> User, user => user.doctorProfile)
    @JoinColumn()
    user: User;

    @Column({nullable: true})
    specialization: string;

    @Column({nullable: true})
    bio: string

    @OneToMany(() => Slot, (slot) => slot.doctor)
    slots: Slot[];
}