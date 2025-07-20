import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from 'src/entities/appointment.entity';
import { Slot } from 'src/entities/slot.entity';
import { Patient } from 'src/entities/patient.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(
        @InjectRepository(Appointment)
        private readonly appointmentRepo: Repository<Appointment>,

        @InjectRepository(Slot)
        private readonly slotRepo: Repository<Slot>,

        @InjectRepository(Patient)
        private readonly patientRepo: Repository<Patient>,
    ) { }

    async createAppointment(userId: string, dto: CreateAppointmentDto) {
        // Step 1: Get the patient profile
        const patient = await this.patientRepo.findOne({
            where: { user: { id: userId } },
            relations: ['user'],
        });

        if (!patient) throw new NotFoundException('Patient profile not found');

        // Step 2: Get the requested slot
        const slot = await this.slotRepo.findOne({
            where: { id: dto.slot_id },
            relations: ['appointments', 'doctor'],
        });

        if (!slot) throw new NotFoundException('Slot not found');
        if (slot.is_booked) throw new BadRequestException('Slot already booked');

        // Step 3: Get all existing appointments of the patient with their slot details
        const existingAppointments = await this.appointmentRepo.find({
            where: { patient: { id: patient.id } },
            relations: ['slot'],
        });

        const newStart = slot.start_time;
        const newEnd = slot.end_time;
        const newDay = slot.day;

        // Step 4: Check for overlapping appointments
        const isOverlapping = existingAppointments.some((appt) => {
            const s = appt.slot;
            return (
                s.day === newDay &&
                !(s.end_time <= newStart || s.start_time >= newEnd)
            );
        });

        if (isOverlapping) {
            throw new BadRequestException(
                'You already have an overlapping appointment at this time.',
            );
        }
        // Step 5: Create the appointment
        const appointment = this.appointmentRepo.create({
            patient,
            slot,
            status: AppointmentStatus.CONFIRMED,
            appointment_reason: dto.appointment_reason ?? undefined,
        });

        // Step 6: Mark slot as booked (you can optionally check for max_bookings here)
        slot.is_booked = true;
        await this.slotRepo.save(slot);

        const saved = await this.appointmentRepo.save(appointment);

        // Step 7: Return clean response with IDs only
        return {
            appointment_id: saved.id,
            patient_id: saved.patient.id,
            doctor_id: saved.slot.doctor.id,
            status: saved.status,
            appointment_reason: saved.appointment_reason,
        };
    }


    async getAllAppointments(
        userId: string,
        userRole: 'doctor' | 'patient',
        status?: string,
        page = 1,
        limit = 10,
    ) {
        const skip = (page - 1) * limit;

        const where: any = {};

        if (status) where.status = status;

        if (userRole === 'doctor') {
            where.slot = { doctor: { user: { id: userId } } };
        } else {
            where.patient = { user: { id: userId } };
        }

        const [appointments, total] = await this.appointmentRepo.findAndCount({
            where,
            relations: {
                patient: { user: true },
                slot: { doctor: { user: true } },
            },
            order: { created_at: 'DESC' },
            skip,
            take: limit,
        });

        const data = appointments.map((appointment) => ({
            appointment_id: appointment.id,
            patient_id: appointment.patient.id,
            doctor_id: appointment.slot.doctor.id,
            status: appointment.status,
            appointment_reason: appointment.appointment_reason,
        }));

        return { data, total, page, limit };
    }


    async getAppointmentById(id: string) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id },
            relations: {
                patient: { user: true },
                slot: { doctor: { user: true } },
            },
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        return {
            appointment_id: appointment.id,
            patient_id: appointment.patient.id,
            doctor_id: appointment.slot.doctor.id,
            status: appointment.status,
            appointment_reason: appointment.appointment_reason,
        };
    }

    async rescheduleAppointment(appointmentId: string, userId: string, dto: RescheduleAppointmentDto) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: ['patient', 'patient.user', 'slot', 'slot.doctor'],
        });

        if (!appointment) throw new NotFoundException('Appointment not found');
        if (appointment.patient.user.id !== userId) throw new ForbiddenException('You can only reschedule your own appointments');

        const newSlot = await this.slotRepo.findOne({
            where: { id: dto.new_slot_id },
            relations: ['appointments'],
        });

        if (!newSlot) throw new NotFoundException('New slot not found');
        if (newSlot.is_booked) throw new BadRequestException('New slot is already booked');

        // Free the old slot
        appointment.slot.is_booked = false;
        await this.slotRepo.save(appointment.slot);

        // Book the new slot
        newSlot.is_booked = true;
        await this.slotRepo.save(newSlot);

        // Update appointment
        appointment.slot = newSlot;
        appointment.status = AppointmentStatus.RESCHEDULED;
        if (dto.appointment_reason) appointment.appointment_reason = dto.appointment_reason;

        return this.appointmentRepo.save(appointment);
    }

    async cancelAppointment(
        appointmentId: string,
        userId: string,
        dto: CancelAppointmentDto,
    ) {
        const appointment = await this.appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: {
                patient: { user: true },
                slot: true,
            },
        });

        if (!appointment) throw new NotFoundException('Appointment not found');

        // check permission (assuming only patient can cancel for now)
        if (appointment.patient.user.id !== userId) {
            throw new ForbiddenException('You are not allowed to cancel this appointment');
        }
        const slot = await this.slotRepo.findOne({
            where: { id: appointment.slot.id },
        });

        if (!slot) {
            throw new NotFoundException('Slot not found');
        }

        const now = new Date(slot.start_time);
        const cancelBefore = new Date(now.getTime() - slot.cancel_before_hours * 60 * 60 * 1000);

        if (now > cancelBefore) {
            throw new BadRequestException('Cancellation time has passed');
        }

        appointment.status = AppointmentStatus.CANCELLED;
        appointment.cancellation_reason = dto.reason || 'Cancelled by patient';
        appointment.slot.is_booked = false;

        await this.slotRepo.save(appointment.slot);
        const saved = await this.appointmentRepo.save(appointment);

        return {
            appointment_id: saved.id,
            status: saved.status,
            cancellation_reason: saved.cancellation_reason,
        };
    }

}
