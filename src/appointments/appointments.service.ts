import {
  BadRequestException,
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from 'src/entities/appointment.entity';
import { Patient } from 'src/entities/patient.entity';
import { Slot } from 'src/entities/slot.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { Session } from 'src/entities/session.entity';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,

    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,

    @InjectRepository(Slot)
    private slotRepo: Repository<Slot>,

    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
  ) {}

  async createAppointment(userId: string, dto: CreateAppointmentDto) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const slot = await this.slotRepo.findOne({
      where: { id: dto.slot_id },
      relations: ['appointments', 'session', 'doctor'],
    });
  
    if (!slot) throw new NotFoundException('Slot not found');

    const session = slot.session;
    if (!session) throw new BadRequestException('Slot must have a session');

    // Check within session timing
    if (
      slot.start_time < session.start_time ||
      slot.end_time > session.end_time
    ) {
      throw new BadRequestException('Slot must fall within session time');
    }

    // Check max booking
    const totalBooked = await this.appointmentRepo.count({
      where: { slot: { id: slot.id } },
    });
    if (totalBooked >= slot.max_bookings) {
      throw new BadRequestException('Slot is already fully booked');
    }

    // Overlap check
    const existingAppointments = await this.appointmentRepo.find({
      where: { patient: { id: patient.id } },
      relations: ['slot', 'slot.session'],
    });

    const overlaps = existingAppointments.some((appt) => {
      const s = appt.slot;
      const sess = s.session;
      return (
        sess.day === session.day &&
        !(s.end_time <= slot.start_time || s.start_time >= slot.end_time)
      );
    });

    if (overlaps) {
      throw new BadRequestException('You have overlapping appointment');
    }
   
    const appointment = this.appointmentRepo.create({
      patient,
      slot,
      status: AppointmentStatus.CONFIRMED,
      appointment_reason: dto.appointment_reason,
    });

    const saved = await this.appointmentRepo.save(appointment);

    if (totalBooked + 1 >= slot.max_bookings) {
      slot.is_booked = true;
      await this.slotRepo.save(slot);
    }

    return {
      appointment_id: saved.id,
      slot_id: slot.id,
      session_id: session.id,
      doctor_id: slot.doctor.id,
      status: saved.status,
      reason: saved.appointment_reason,
    };
  }

  async rescheduleAppointment(appointmentId: string, userId: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['patient', 'patient.user', 'slot', 'slot.session', 'slot.doctor'],
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.patient.user.id !== userId) throw new BadRequestException('Unauthorized');

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

    appointment.slot = newSlot;
    appointment.status = AppointmentStatus.RESCHEDULED;

    const updated = await this.appointmentRepo.save(appointment);

    // Free up old slot if needed
    const remainingAppointments = await this.appointmentRepo.count({
      where: { slot: { id: oldSlot.id } },
    });

    if (remainingAppointments < oldSlot.max_bookings) {
      oldSlot.is_booked = false;
      await this.slotRepo.save(oldSlot);
    }

    if (totalNewBookings + 1 >= newSlot.max_bookings) {
      newSlot.is_booked = true;
      await this.slotRepo.save(newSlot);
    }

    return {
      message: 'Appointment rescheduled successfully',
      appointment_id: updated.id,
      slot_id: newSlot.id,
    };
  }

  async cancelAppointment(appointmentId: string, userId: string, reason?: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: ['patient', 'patient.user', 'slot'],
    });

    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.patient.user.id !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    appointment.cancellation_reason = reason || "Patient's wish!";

    const saved = await this.appointmentRepo.save(appointment);

    // Free the slot if applicable
    const countRemaining = await this.appointmentRepo.count({
      where: { slot: { id: appointment.slot.id }, status: AppointmentStatus.CONFIRMED },
    });

    if (countRemaining < appointment.slot.max_bookings) {
      appointment.slot.is_booked = false;
      await this.slotRepo.save(appointment.slot);
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
