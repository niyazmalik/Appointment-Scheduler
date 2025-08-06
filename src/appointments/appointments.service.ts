import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from 'src/entities/appointment.entity';
import { Patient } from 'src/entities/patient.entity';
import { Slot } from 'src/entities/slot.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

@Injectable()
export class AppointmentService {
    constructor(
        @InjectRepository(Appointment)
        private appointmentRepo: Repository<Appointment>,

        @InjectRepository(Patient)
        private patientRepo: Repository<Patient>,

        @InjectRepository(Slot)
        private slotRepo: Repository<Slot>,
    ) { }

    async createAppointment(userId: string, dto: CreateAppointmentDto) {
        const patient = await this.patientRepo.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });
        if (!patient) throw new NotFoundException('Patient not found');

        const slot = await this.slotRepo.findOne({
            where: { id: dto.slot_id },
            relations: ['session', 'appointments', 'doctor'],
        });

        if (!slot) throw new NotFoundException('Slot not found');

        const session = slot.session;
        if (!session) throw new BadRequestException('Slot must have a session');

        const now = new Date();
        const todayBookingStart = getTodayDateTime(session.booking_start_time);
        const todayBookingEnd = getTodayDateTime(session.booking_end_time);

        if (now < todayBookingStart || now > todayBookingEnd) {
            throw new BadRequestException('Booking is not allowed at this time');
        }

        if (
            slot.start_time < session.consult_start_time ||
            slot.end_time > session.consult_end_time
        ) {
            throw new BadRequestException('Slot must fall within session time');
        }

        const totalBooked = await this.appointmentRepo.count({
            where: { slot: { id: slot.id } },
        });
        if (totalBooked >= slot.max_bookings) {
            throw new BadRequestException('Slot is already fully booked');
        }

        const existingAppointments = await this.appointmentRepo.find({
            where: { patient: { id: patient.id } },
            relations: ['slot', 'slot.session'],
        });

        const overlaps = existingAppointments.some((appt) => {
            const s = appt.slot;
            if (s) {
                const sess = s.session;
                return (
                    sess.day === session.day &&
                    !(s.end_time <= slot.start_time || s.start_time >= slot.end_time)
                );
            }
        });

        if (overlaps) {
            throw new BadRequestException('You have overlapping appointment');
        }
        const reportingTimeDate = getTodayDateTime(slot.start_time);
        reportingTimeDate.setMinutes(
            reportingTimeDate.getMinutes() + totalBooked * session.avg_consult_time,
        );
        const reporting_time = reportingTimeDate.toTimeString().slice(0, 5);

        const appointment = this.appointmentRepo.create({
            patient,
            slot,
            status: AppointmentStatus.CONFIRMED,
            appointment_reason: dto.appointment_reason,
            reporting_time
        });

        const saved = await this.appointmentRepo.save(appointment);

        if (totalBooked + 1 >= slot.max_bookings) {
            await this.slotRepo.update(slot.id, { is_booked: true });
        }

        return {
            appointment_id: saved.id,
            slot_id: slot.id,
            session_id: session.id,
            doctor_id: slot.doctor.id,
            status: saved.status,
            reason: saved.appointment_reason,
            reporting_time
        };
    }

    async rescheduleAppointment(appointmentId: string, userId: string, dto: RescheduleAppointmentDto) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: ['patient', 'patient.user', 'slot', 'slot.session', 'slot.doctor'],
        });

        if (!appointment) throw new NotFoundException('Appointment not found');
        if (appointment.patient.user.id !== userId) throw new BadRequestException('Unauthorized');

        if (
            appointment.status !== AppointmentStatus.CONFIRMED &&
            appointment.status !== AppointmentStatus.MISSED &&
            appointment.status !== AppointmentStatus.PENDING_RESCHEDULE
        ) {
            throw new BadRequestException('Only missed or pending appointments can be rescheduled');
        }

        const oldSlot = appointment.slot;
        const newSlot = await this.slotRepo.findOne({
            where: { id: dto.new_slot_id },
            relations: ['appointments', 'session', 'doctor'],
        });

        if (!newSlot) throw new NotFoundException('New slot not found');
        const session = newSlot.session;

        const totalNewBookings = await this.appointmentRepo.count({
            where: { slot: { id: newSlot.id } },
        });

        if (totalNewBookings >= newSlot.max_bookings) {
            throw new BadRequestException('New slot is fully booked');
        }
        const reportingTimeDate = getTodayDateTime(newSlot.start_time);
        reportingTimeDate.setMinutes(
            reportingTimeDate.getMinutes() + totalNewBookings * session.avg_consult_time,
        );
        const reporting_time = reportingTimeDate.toTimeString().slice(0, 5);
        appointment.slot = newSlot;
        appointment.status = AppointmentStatus.RESCHEDULED;
        appointment.reporting_time = reporting_time;

        const updated = await this.appointmentRepo.save(appointment);

        if (oldSlot) {
            const remainingAppointments = await this.appointmentRepo.count({
                where: { slot: { id: oldSlot.id } },
            });

            if (remainingAppointments < oldSlot.max_bookings) {
                await this.slotRepo.update(oldSlot.id, { is_booked: false });
            }
        }

        if (totalNewBookings + 1 >= newSlot.max_bookings) {
            await this.slotRepo.update(newSlot.id, { is_booked: true });
        }

        return {
            message: 'Appointment rescheduled successfully',
            appointment_id: updated.id,
            slot_id: newSlot.id,
            reporting_time
        };
    }

    async cancelAppointment(appointmentId: string, userId: string, dto: CancelAppointmentDto) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: ['patient', 'patient.user', 'slot'],
        });

        if (!appointment) throw new NotFoundException('Appointment not found');
        if (appointment.patient.user.id !== userId) {
            throw new BadRequestException('Unauthorized');
        }

        appointment.status = AppointmentStatus.CANCELLED;
        appointment.cancellation_reason = dto.reason || "Patient's wish!";

        const saved = await this.appointmentRepo.save(appointment);

        if (appointment.slot) {
            const countRemaining = await this.appointmentRepo.count({
                where: { slot: { id: appointment.slot.id }, status: AppointmentStatus.CONFIRMED || AppointmentStatus.RESCHEDULED },
            });

            if (countRemaining < appointment.slot.max_bookings) {
                await this.slotRepo.update(appointment.slot.id, { is_booked: false });
            }
        }

        return {
            message: 'Appointment cancelled successfully',
            appointment_id: saved.id,
        };
    }

    async getAppointmentById(appointmentId: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: ['patient', 'patient.user', 'slot', 'slot.session', 'slot.doctor'],
        });
        if (!appointment) throw new NotFoundException('Appointment not found');
        return appointment;
    }
}

function getTodayDateTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    now.setHours(hours, minutes, 0, 0);
    return now;
}
