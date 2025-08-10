import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Slot } from './slot.entity';
import { Session } from './session.entity';
import { RecurringSession } from './recurring-session.entity';

@Entity('doctors')
export class Doctor {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @OneToOne(() => User, user => user.doctorProfile)
    @JoinColumn()
    user: User;

    @Column({ nullable: true })
    specialization: string;

    @Column({ nullable: true })
    bio: string

    @OneToMany(() => Session, (session) => session.doctor)
    sessions: Session[];

    @OneToMany(() => RecurringSession, (recurring) => recurring.doctor)
    recurring_sessions: RecurringSession[];

    @OneToMany(() => Slot, (slot) => slot.doctor)
    slots: Slot[];
}