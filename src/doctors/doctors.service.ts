import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Slot } from '../entities/slot.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from '../entities/session.entity';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Appointment, AppointmentStatus } from 'src/entities/appointment.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) { }

  async getAllDoctors(search = '', page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.doctorRepo.findAndCount({
      where: [
        { user: { name: ILike(`%${search}%`) } },
        { user: { email: ILike(`%${search}%`) } },
        { user: { phone_number: ILike(`%${search}%`) } },
      ],
      relations: ['user'],
      skip,
      take: limit,
      order: { id: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDoctorById(id: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { id },
      relations: ['user', 'slots'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return doctor;
  }

  async createSession(userId: string, dto: CreateSessionDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const session = this.sessionRepo.create({
      ...dto,
      doctor,
    });

    const saved = await this.sessionRepo.save(session);

    return {
      id: saved.id,
      day: saved.day,
      start_time: saved.consult_start_time,
      end_time: saved.consult_end_time,
    };
  }

  async createSlotInSession(userId: string, sessionId: string, dto: CreateSlotDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['doctor'],
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.doctor.id !== doctor.id)
      throw new ForbiddenException('You are not authorized to add slot to this session');

    const slotStart = dto.start_time;
    const slotEnd = dto.end_time;
    const sessionStart = session.consult_start_time.slice(0, 5);
    const sessionEnd = session.consult_end_time.slice(0, 5);

    if (slotStart >= slotEnd) {
      throw new BadRequestException('Slot start time must be before end time');
    }

    if (slotStart < sessionStart || slotEnd > sessionEnd) {
      throw new BadRequestException('Slot timing must lie within session timing');
    }

    const existingSlots = await this.slotRepo.find({
      where: { session: { id: session.id } },
    });

    const overlaps = existingSlots.some((slot) => {
      const sStart = slot.start_time.slice(0, 5);
      const sEnd = slot.end_time.slice(0, 5);
      return slotStart < sEnd && slotEnd > sStart;
    });

    if (overlaps) {
      throw new BadRequestException('Slot overlaps with an existing slot in this session');
    }

    const slot = this.slotRepo.create({
      ...dto,
      session,
      doctor,
    });

    await this.slotRepo.save(slot);

    return {
      message: 'Slot created successfully',
      data: {
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        avg_consult_time: session.avg_consult_time,
        max_bookings: slot.max_bookings,
      },
    };
  }

  async getSlotsInSession(userId: string, sessionId: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['doctor'],
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.doctor.id !== doctor.id)
      throw new ForbiddenException('You are not authorized to view slots of this session');

    const slots = await this.slotRepo.find({
      where: { session: { id: sessionId } },
      relations: ['appointments'],
      order: { start_time: 'ASC' },
    });

    return {
      message: 'Slots fetched successfully',
      data: slots,
    };
  }

  async updateSession(
    doctorUserId: string,
    sessionId: string,
    dto: UpdateSessionDto,
  ) {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['doctor', 'doctor.user', 'slots', 'slots.appointments'],
      order: {
        slots: {
          start_time: 'ASC',
        },
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    if (session.doctor.user.id !== doctorUserId) {
      throw new ForbiddenException('Unauthorized to update this session');
    }

    const originalStart = session.consult_start_time;
    const originalEnd = session.consult_end_time;

    const newStart = dto.consult_start_time || originalStart.slice(0, 5);
    const newEnd = dto.consult_end_time || originalEnd.slice(0, 5);

    if (newStart >= newEnd) {
      throw new BadRequestException('start_time must be before end_time');
    }

    const startChanged = dto.consult_start_time && dto.consult_start_time !== originalStart.slice(0, 5);
    const endChanged = dto.consult_end_time && dto.consult_end_time !== originalEnd.slice(0, 5);

    const { consult_start_time, consult_end_time } = dto;

    if (consult_start_time && consult_end_time && consult_start_time >= consult_end_time) {
      throw new BadRequestException('Start time must be before end time.');
    }

    if (startChanged) {
      await this.handleStartTimeShrinkOrExpand(session, newStart);
    }

    if (endChanged) {
      return await this.handleEndTimeShrinkOrExpand(session, newEnd);
    }
  }


  /****************************************************************************************************
   *                                        HERE IT BEGINS...                                       *                                                                     *
   ****************************************************************************************************/


  private async handleStartTimeShrinkOrExpand(session: Session, newStartTime: string) {
    // will handle it once other one is done...
  }

  private async handleEndTimeShrinkOrExpand(session: Session, newEndTime: string) {
    const { originalEnd, newEnd, isShrink, currentTime } = this.getContextForEndShrink(session, newEndTime);
    console.log(currentTime, newEnd, isShrink);

    if (!isShrink) {
      return {
        message: 'Session end time extended. New slots can now be added as needed.',
      };
    }

    const { affectedAppointments, slotsToDelete } = this.extractAffectedAppointmentsAndDeletableSlotsFromEnd(
      session,
      newEnd,
      originalEnd,
    );

    if (affectedAppointments.length === 0) {
      session.consult_end_time = newEndTime;
      await this.sessionRepo.save(session);
      await this.slotRepo.delete(slotsToDelete.map(s => s.id));
      return {
        deleted_slots: slotsToDelete,
        message: 'Successfully deleted the slots!'
      };
    }

    const validSlotsForAdjust = this.getValidSlotsForAdjustmentForEndShrink(session, newEnd, currentTime);
    const bookingCountMap = new Map<string, number>();
    const slotsToUpdate = new Set<Slot>();
    const adjusted: Appointment[] = [];
    const pending: Appointment[] = [];

    const isDoctorShrinkingDuringBooking = this.isDoctorShrinkingDuringBooking(session, currentTime);

    if (isDoctorShrinkingDuringBooking) {
      const consultStartTime = session.consult_start_time.slice(0, 5);
      const totalAvailableMinutes = this.getTotalAvailableMinutes(consultStartTime, newEnd);
      const bookedAppointments = this.getBookedAppointments(session);

      const totalAppointments = bookedAppointments.length;
      const totalMaxBookings = this.getTotalMaxBookings(session);

      if (totalAppointments === totalMaxBookings) {
        return await this.handleFullyBookedCaseForEndShrink(
          bookedAppointments,
          totalAppointments,
          bookingCountMap,
          consultStartTime,
          totalAvailableMinutes,
          session,
          newEndTime,
          slotsToUpdate,
          slotsToDelete
        );
      }
      await this.handlePartialBookedCaseForEndShrink(
        session,
        affectedAppointments,
        validSlotsForAdjust,
        slotsToUpdate,
        bookingCountMap,
        adjusted,
        pending
      );

      session.consult_end_time = newEndTime;
      await this.sessionRepo.save(session);
      await this.slotRepo.save([...slotsToUpdate]);
      await this.appointmentRepo.save([...adjusted]);

      if (pending.length > 0) {
        const safeAppointments = this.getBookedAppointments(session);
        const bookedAppointments = [...safeAppointments, ...pending];
        const totalAppointments = bookedAppointments.length;

        return await this.handleFullyBookedCaseForEndShrink(
          bookedAppointments,
          totalAppointments,
          bookingCountMap,
          consultStartTime,
          totalAvailableMinutes,
          session,
          newEndTime,
          slotsToUpdate,
          slotsToDelete
        );
      }

      await this.slotRepo.delete(slotsToDelete.map(s => s.id));
      return {
        message: `All appointments adjusted successfully.`,
      };
    }

    for (const appointment of affectedAppointments) {
      const availableSlot = this.findAvailableSlotForAppointmentForEndShrink(validSlotsForAdjust, currentTime, bookingCountMap);

      if (availableSlot) {
        const existingBookings = availableSlot.appointments.length;
        const adjustedCount = bookingCountMap.get(availableSlot.id) || 0;
        const totalBookings = existingBookings + adjustedCount;

        if (totalBookings + 1 === availableSlot.max_bookings) {
          availableSlot.is_booked = true;
          slotsToUpdate.add(availableSlot);
        }

        appointment.slot = availableSlot;
        appointment.reporting_time = this.calculateReportingTime(
          availableSlot.start_time,
          session.avg_consult_time,
          totalBookings
        );
        adjusted.push(appointment);
        bookingCountMap.set(availableSlot.id, adjustedCount + 1);

      } else {
        appointment.status = AppointmentStatus.PENDING_RESCHEDULE;
        appointment.slot = null;
        pending.push(appointment);
      }
    }
    session.consult_end_time = newEndTime;
    await this.sessionRepo.save(session);
    await this.slotRepo.save([...slotsToUpdate]);
    await this.appointmentRepo.save([...adjusted, ...pending]);
    await this.slotRepo.delete(slotsToDelete.map(s => s.id));
    return {
      message: `Adjusted ${adjusted.length} appointments, ${pending.length} require manual reschedule.`,
    };
  }


  /****************************************************************************************************
   *                                        HERE IT ENDS...                                       *                                                                     *
   ****************************************************************************************************/


  private getTotalAvailableMinutes(start: string, end: string): number {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;

    return endTotalMinutes - startTotalMinutes;
  }

  private getBookedAppointments(session: Session): Appointment[] {
    return session.slots
      .flatMap(slot => slot.appointments)
      .filter(app =>
        [AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED].includes(app.status),
      );
  }

  private getTotalMaxBookings(session: Session): number {
    return session.slots.reduce((sum, slot) => sum + slot.max_bookings, 0);
  }

  private calculateReportingTime(slotStartTime: string, avgConsultTime: number, totalBookings: number): string {
    const [hours, minutes] = slotStartTime.split(':').map(Number);
    const reportingTimeDate = new Date(1970, 0, 1, hours, minutes, 0);

    reportingTimeDate.setMinutes(
      reportingTimeDate.getMinutes() + totalBookings * avgConsultTime
    );

    return reportingTimeDate.toTimeString().slice(0, 5);
  }

  private isDoctorShrinkingDuringBooking(session: Session, currentTime: string): boolean {
    const bookingStart = session.booking_start_time.slice(0, 5);
    const consultStart = session.consult_start_time.slice(0, 5);

    const [hours, minutes] = consultStart.split(':').map(Number);
    const baseDate = new Date(1970, 0, 1, hours, minutes);
    const bufferBeforeConsult = new Date(baseDate.getTime() - 2 * 60 * 60 * 1000);

    const bufferTimeStr = bufferBeforeConsult.toTimeString().slice(0, 5);

    return currentTime >= bookingStart && currentTime <= bufferTimeStr;
  }

  private async handleFullyBookedCaseForEndShrink(
    bookedAppointments: Appointment[],
    totalAppointments: number,
    bookingCountMap: Map<string, number>,
    consultStartTime: string,
    totalAvailableMinutes: number,
    session: Session,
    newEndTime: string,
    slotsToUpdate: Set<Slot>,
    slotsToDelete: Slot[],
  ) {
    const maxAppointmentsPossible = Math.floor(totalAvailableMinutes / 5);
    const dynamicConsultTime = Math.floor(totalAvailableMinutes / totalAppointments);

    if (!session.slots.length) {
      throw new Error('No slots found for session.');
    }
    const oneSlot = session.slots[0];
    const slotStart = oneSlot.start_time.slice(0, 5);
    const slotEnd = oneSlot.end_time.slice(0, 5);
    const slotDurationInMinutes = this.getTotalAvailableMinutes(slotStart, slotEnd);
    const maxBookingsPerSlot = Math.floor(slotDurationInMinutes / dynamicConsultTime);

    if (maxAppointmentsPossible >= totalAppointments) {
      for (let i = 0; i < totalAppointments; i++) {
        const app = bookedAppointments[i];
        const [hours, minutes] = consultStartTime.split(':').map(Number);
        const baseDate = new Date(1970, 0, 1, hours, minutes);

        const newReportingTime = new Date(
          baseDate.getTime() + i * dynamicConsultTime * 60 * 1000,
        );

        const reporting_time = newReportingTime.toTimeString().slice(0, 5);
        app.reporting_time = reporting_time;

        const matchingSlot = session.slots.find(slot => {
          return (
            reporting_time >= slot.start_time.slice(0, 5) &&
            reporting_time < slot.end_time.slice(0, 5)
          );
        });

        if (!matchingSlot) {
          throw new Error(`No matching slot found for reporting time ${newReportingTime}`);
        }

        app.slot = matchingSlot;

        const currentCount = bookingCountMap.get(matchingSlot.id) || 0;
        bookingCountMap.set(matchingSlot.id, currentCount + 1);

        if (currentCount + 1 === maxBookingsPerSlot) {
          matchingSlot.is_booked = true;
          matchingSlot.max_bookings = maxBookingsPerSlot;
          slotsToUpdate.add(matchingSlot);
        }
      }
      session.avg_consult_time = dynamicConsultTime;
      await this.saveSessionAndDeleteSlots(session, newEndTime, slotsToDelete, slotsToUpdate, bookedAppointments);
      return {
        message: 'All appointments adjusted with reduced consult time.',
      };

    } else {
      const adjustable = bookedAppointments.slice(0, maxAppointmentsPossible);
      const unfitAppointments = bookedAppointments.slice(maxAppointmentsPossible);

      for (let i = 0; i < adjustable.length; i++) {
        const app = adjustable[i];
        const [h, m] = consultStartTime.split(':').map(Number);
        const iso = new Date(1970, 0, 1, h, m);

        const newReportingTime = new Date(
          iso.getTime() + i * 5 * 60 * 1000,
        );
        const reporting_time = newReportingTime.toTimeString().slice(0, 5);

        app.reporting_time = reporting_time;
        const matchingSlot = session.slots.find(slot => {
          return (
            reporting_time >= slot.start_time.slice(0, 5) &&
            reporting_time < slot.end_time.slice(0, 5)
          );
        });

        if (!matchingSlot) {
          throw new Error(`No matching slot found for reporting time ${newReportingTime}`);
        }

        app.slot = matchingSlot;

        const currentCount = bookingCountMap.get(matchingSlot.id) || 0;
        bookingCountMap.set(matchingSlot.id, currentCount + 1);

        if (currentCount + 1 === maxBookingsPerSlot) {
          matchingSlot.is_booked = true;
          matchingSlot.max_bookings = maxBookingsPerSlot;
          slotsToUpdate.add(matchingSlot);
        }
      }

      unfitAppointments.forEach(a => {
        a.status = AppointmentStatus.PENDING_RESCHEDULE;
        a.slot = null;
      });
      const allAppointmentsToSave = [...adjustable, ...unfitAppointments];
      session.avg_consult_time = dynamicConsultTime;

      await this.saveSessionAndDeleteSlots(session, newEndTime, slotsToDelete, slotsToUpdate, allAppointmentsToSave);
      return {
        message: `Only ${maxAppointmentsPossible} appointments could be adjusted. ${unfitAppointments.length} need manual reschedule.`,
        reschedule_required: unfitAppointments.map(a => a.id),
      };
    }
  }

  private async handlePartialBookedCaseForEndShrink(
    session: Session,
    affectedAppointments: Appointment[],
    validSlotsForAdjust: Slot[],
    slotsToUpdate: Set<Slot>,
    bookingCountMap: Map<string, number>,
    adjusted: Appointment[],
    pending: Appointment[]
  ) {

    let slotIndex = validSlotsForAdjust.length - 1;

    for (const appointment of affectedAppointments.reverse()) {
      while (slotIndex >= 0) {
        const slot = validSlotsForAdjust[slotIndex];
        const adjustedCount = bookingCountMap.get(slot.id) || 0;
        const totalBookings = slot.appointments.length + adjustedCount;

        if (totalBookings < slot.max_bookings) {
          this.updateAppointmentSlotAndTime(appointment, slot, session, totalBookings);
          bookingCountMap.set(slot.id, adjustedCount + 1);
          adjusted.push(appointment);

          if (totalBookings + 1 === slot.max_bookings) {
            slot.is_booked = true;
            slotsToUpdate.add(slot);
          }
          break;
        } else {
          slotIndex--;
        }
      } 1

      if (!appointment.slot) {
        pending.push(appointment);
      }
    }
  }

  private getValidSlotsForAdjustmentForEndShrink(session: Session, newEnd: String, currentTime: string): Slot[] {
    const consultStart = session.consult_start_time.slice(0, 5);

    return session.slots.filter(slot => {
      const slotStart = slot.start_time.slice(0, 5);
      const isWithinNewWindow = slotStart >= consultStart && slotStart < newEnd;
      const isNotAttendedYet = slotStart >= currentTime;
      return isWithinNewWindow && isNotAttendedYet;
    });
  }

  private findAvailableSlotForAppointmentForEndShrink(validSlots: Slot[], currentTime: string, bookingMap: Map<string, number>): Slot | undefined {
    return validSlots.find(slot => {
      const slotStart = slot.start_time.slice(0, 5);
      const isAfterBuffer = this.getTotalAvailableMinutes(slotStart, currentTime) >= 60 * 60 * 1000;

      const adjustedCount = bookingMap.get(slot.id) || 0;
      const totalBookings = slot.appointments.length + adjustedCount;

      const hasSpace = totalBookings < slot.max_bookings;
      return hasSpace && isAfterBuffer;
    });
  }

  private extractAffectedAppointmentsAndDeletableSlotsFromEnd(session: Session, newEnd: string, originalEnd: string): { affectedAppointments: Appointment[]; slotsToDelete: Slot[] } {
    const affectedAppointments: Appointment[] = [];
    const slotsToDelete: Slot[] = [];

    for (let i = session.slots.length - 1; i >= 0; i--) {
      const slot = session.slots[i];
      const slotStart = slot.start_time.slice(0, 5);
      const slotEnd = slot.end_time.slice(0, 5);

      if (slotStart < newEnd && slotEnd > newEnd && slotEnd <= originalEnd) {
        const affected = slot.appointments.filter(app => {
          const reportingTime = app.reporting_time.slice(0, 5);
          return reportingTime > newEnd;
        });

        affectedAppointments.push(...affected);
        break;
      }

      else if (slotStart >= newEnd && slotStart < originalEnd) {
        if (slot.appointments.length !== 0) {
          affectedAppointments.push(...slot.appointments);
        }
        slotsToDelete.push(slot);
      }

      else {
        break;
      }
    }
    return { affectedAppointments, slotsToDelete };
  }

  private getContextForEndShrink(session: Session, newEndTime: string) {
    const originalEnd = session.consult_end_time.slice(0, 5);
    const newEnd = newEndTime;
    const isShrink = newEnd < originalEnd;

    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });

    return { originalEnd, newEnd, isShrink, currentTime };
  }

  private updateAppointmentSlotAndTime(
    appointment: Appointment,
    slot: Slot,
    session: Session,
    totalBookings: number,
  ) {
    appointment.slot = slot;
    appointment.reporting_time = this.calculateReportingTime(
      slot.start_time,
      session.avg_consult_time,
      totalBookings,
    );
  }

  private async saveSessionAndDeleteSlots(session: Session, newEndTime: string, slotsToDelete: Slot[], slotsToUpdate: Set<Slot>, appointments: Appointment[]) {
    session.consult_end_time = newEndTime;
    await this.sessionRepo.save(session);
    await this.slotRepo.save([...slotsToUpdate]);
    await this.appointmentRepo.save(appointments);
    if (slotsToDelete.length > 0) {
      await this.slotRepo.delete(slotsToDelete.map((s) => s.id));
    }
  }
}
