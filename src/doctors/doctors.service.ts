import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, MoreThanOrEqual, Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Slot } from '../entities/slot.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { Session } from '../entities/session.entity';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Appointment, AppointmentStatus } from '../entities/appointment.entity';
import { RecurringSession } from '../entities/recurring-session.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Slot)
    private readonly slotRepo: Repository<Slot>,

    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,

    @InjectRepository(RecurringSession)
    private readonly recurringSessionRepo: Repository<RecurringSession>,

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


    let recurringTemplate: RecurringSession | null = null;

    if (dto.recurring_template) {
      recurringTemplate = await this.recurringSessionRepo.findOne({
        where: { id: dto.recurring_template },
      });

      if (!recurringTemplate) {
        throw new NotFoundException('Recurring session template not found');
      }
    }

    const session = this.sessionRepo.create({
      ...dto,
      doctor,
      recurring_template: recurringTemplate || null,
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

  async getUpcomingSessionsWithBookability(doctorId: string) {
    const today = new Date().toISOString().slice(0,10);
    const sessions = await this.sessionRepo.find({
      where: {
        doctor: { id: doctorId },
        is_active: true,
        session_date: MoreThanOrEqual(today),
      },
      relations: ['slots'],
      order: { session_date: 'ASC' },
    });

    let foundFirstBookable = false;

    return sessions.map((session) => {
      const freeSlots = session.slots.filter((s) => !s.is_booked);

      const isFullyBooked = freeSlots.length === 0;

      const isBookable = !foundFirstBookable && !isFullyBooked;

      if (isBookable) foundFirstBookable = true;

      return {
        ...session,
        is_fully_booked: isFullyBooked,
        is_bookable: isBookable,
      };
    });
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
      return await this.handleEndTimeShrinkOrExpand(session, newEnd, dto);
    }
  }


  /****************************************************************************************************
   *                                        HERE IT BEGINS...                                       *                                                                     *
   ****************************************************************************************************/


  private async handleStartTimeShrinkOrExpand(session: Session, newStartTime: string) {
    const { originalStart, newStart, isShrink } = this.getContextForStartChange(session, newStartTime);

    if (!isShrink) {
      const generatedSlots = this.generateSlotsStartExpansion(session, newStart, originalStart);

      session.consult_start_time = newStartTime;
      await this.sessionRepo.save(session);

      await this.slotRepo.save(generatedSlots);

      return {
        new_slots: generatedSlots,
        message: 'Session start time expanded and new slots generated.'
      };
    }
  }

  private async handleEndTimeShrinkOrExpand(session: Session, newEndTime: string, dto: UpdateSessionDto) {
    const { originalEnd, newEnd, isShrink } = this.getContextForEndShrink(session, newEndTime);
    const currentTime = "08:00";

    if (!isShrink) {
      const generatedSlots = this.generateSlotsEndExpansion(session, originalEnd, newEnd);

      session.consult_end_time = newEndTime;
      await this.sessionRepo.save(session);

      await this.slotRepo.save(generatedSlots);

      return {
        new_slots: generatedSlots,
        message: 'Session end time extended and new slots generated.'
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
          dto,
          bookedAppointments,
          totalAppointments,
          bookingCountMap,
          totalAvailableMinutes,
          session,
          newEndTime,
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
        const allAppointments = [...this.getBookedAppointments(session), ...pending];
        const bookedAppointments = Array.from(
          new Map(allAppointments.map(a => [a.id, a])).values()
        );
        const totalAppointments = bookedAppointments.length;

        return await this.handleFullyBookedCaseForEndShrink(
          dto,
          bookedAppointments,
          totalAppointments,
          bookingCountMap,
          totalAvailableMinutes,
          session,
          newEndTime,
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
          availableSlot.start_time.slice(0, 5),
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

    let [hours, minutes] = consultStart.split(':').map(Number);

    hours -= 1;

    if (hours < 0) {
      hours = 24 + hours;
    }
    const bufferTimeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return currentTime >= bookingStart && currentTime <= bufferTimeStr;
  }

  private async handleFullyBookedCaseForEndShrink(
    dto: UpdateSessionDto,
    bookedAppointments: Appointment[],
    totalAppointments: number,
    bookingCountMap: Map<string, number>,
    totalAvailableMinutes: number,
    session: Session,
    newEndTime: string,
    slotsToDelete: Slot[],
  ) {
    let dynamicConsultTime = Math.floor(totalAvailableMinutes / totalAppointments);
    dynamicConsultTime = Math.max(dynamicConsultTime, dto.min_consult_time ?? 5);

    console.log(`Available Minutes: ${totalAvailableMinutes}, Total Apps: ${totalAppointments}`);
    console.log(`dynamicConsultTime after min check: ${dynamicConsultTime}`);

    if (!session.slots.length) {
      throw new Error("No slots found for session.");
    }

    const sortedSlots = [...session.slots].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );

    const assignableAppointments: Appointment[] = [];
    const unfitAppointments: Appointment[] = [];

    let appIndex = 0;
    let currentSlotIndex = 0;
    let currentSlot = sortedSlots[currentSlotIndex];

    // We'll use the slot times to know where we can put appointments
    let [h, m] = currentSlot.start_time.split(":").map(Number);
    let currentTime = new Date(1970, 0, 1, h, m);

    while (appIndex < bookedAppointments.length && currentSlot) {
      const app = bookedAppointments[appIndex];

      // If current time exceeds this slot's end_time, move to next slot
      const [endH, endM] = currentSlot.end_time.split(":").map(Number);
      const slotEndTime = new Date(1970, 0, 1, endH, endM);

      if (currentTime >= slotEndTime) {
        currentSlotIndex++;
        currentSlot = sortedSlots[currentSlotIndex];
        if (!currentSlot) break; // No more slots
        [h, m] = currentSlot.start_time.split(":").map(Number);
        currentTime = new Date(1970, 0, 1, h, m);
        continue;
      }

      // Assign appointment to this time and slot
      app.reporting_time = currentTime.toTimeString().slice(0, 5);
      app.slot = currentSlot;

      const currentCount = bookingCountMap.get(currentSlot.id) || 0;
      bookingCountMap.set(currentSlot.id, currentCount + 1);

      assignableAppointments.push(app);

      // Move to next available time
      currentTime = new Date(currentTime.getTime() + dynamicConsultTime * 60000);
      appIndex++;
    }

    // Mark remaining appointments for manual reschedule
    if (appIndex < bookedAppointments.length) {
      const remaining = bookedAppointments.slice(appIndex);
      for (const app of remaining) {
        app.status = AppointmentStatus.PENDING_RESCHEDULE;
        app.slot = null;
        unfitAppointments.push(app);
      }
    }

    // Update session consult time
    session.avg_consult_time = dynamicConsultTime;

    const allToSave = [...assignableAppointments, ...unfitAppointments];

    await this.saveSessionAndDeleteSlots(
      session,
      newEndTime,
      slotsToDelete,
      new Set(sortedSlots),
      allToSave,
    );

    if (unfitAppointments.length > 0) {
      return {
        message: `Only ${assignableAppointments.length} appointments adjusted. ${unfitAppointments.length} need manual reschedule.`,
        reschedule_required: unfitAppointments.map((a) => a.id),
      };
    } else {
      return {
        message: "All appointments adjusted with reduced consult time.",
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

    for (const appointment of affectedAppointments) {
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
      }

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
      const isAfterBuffer = this.getTotalAvailableMinutes(currentTime, slotStart) >= 15;

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

    return { originalEnd, newEnd, isShrink };
  }

  private getContextForStartChange(session: Session, newStartTime: string) {
    const originalStart = session.consult_start_time.slice(0, 5);
    const newStart = newStartTime;
    const isShrink = newStart > originalStart;

    return { originalStart, newStart, isShrink };
  }

  private updateAppointmentSlotAndTime(
    appointment: Appointment,
    slot: Slot,
    session: Session,
    totalBookings: number,
  ) {
    appointment.slot = slot;
    appointment.reporting_time = this.calculateReportingTime(
      slot.start_time.slice(0, 5),
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

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private createSlot(
    sessionId: string,
    doctorId: string,
    startMinutes: number,
    endMinutes: number,
    consultTime: number,
  ): Slot {
    const slotDurationMinutes = endMinutes - startMinutes;
    const maxBookings = Math.floor(slotDurationMinutes / consultTime) || 1;

    return this.slotRepo.create({
      session: { id: sessionId },
      doctor: { id: doctorId },
      start_time: this.minutesToTime(startMinutes),
      end_time: this.minutesToTime(endMinutes),
      is_booked: false,
      max_bookings: maxBookings,
    });
  }

  private generateSlotsEndExpansion(
    session: Session,
    rangeStart: string,
    rangeEnd: string,
  ): Slot[] {
    const slots: Slot[] = [];
    const consultTime = session.avg_consult_time;
    const slotDuration = session.slot_duration;

    let current = this.timeToMinutes(rangeStart);
    const endLimit = this.timeToMinutes(rangeEnd);

    while (current + slotDuration <= endLimit) {
      const slotEnd = current + slotDuration;
      slots.push(this.createSlot(session.id, session.doctor.id, current, slotEnd, consultTime));
      current = slotEnd;
    }

    // If any remaining time after last full slot, create a smaller slot
    if (current < endLimit) {
      slots.push(this.createSlot(session.id, session.doctor.id, current, endLimit, consultTime));
    }

    return slots;
  }

  private generateSlotsStartExpansion(
    session: Session,
    rangeStart: string,
    rangeEnd: string,
  ): Slot[] {
    const slots: Slot[] = [];
    const consultTime = session.avg_consult_time;
    const slotDuration = session.slot_duration;

    let current = this.timeToMinutes(rangeEnd);
    const startLimit = this.timeToMinutes(rangeStart);

    while (current - slotDuration >= startLimit) {
      const slotStart = current - slotDuration;
      slots.push(this.createSlot(session.id, session.doctor.id, slotStart, current, consultTime));
      current = slotStart;
    }

    if (current > startLimit) {
      slots.push(this.createSlot(session.id, session.doctor.id, startLimit, current, consultTime));
    }

    return slots.reverse();
  }

  private getCurrentISTTime(): string {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
  }
}
