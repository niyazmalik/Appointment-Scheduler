import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from 'src/entities/appointment.entity';
import { Slot } from 'src/entities/slot.entity';
import { Patient } from 'src/entities/patient.entity';
import { AppointmentsController } from './appointments.controller';
import { AppointmentService } from './appointments.service';
import { Session } from 'src/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Slot, Patient, Session])],
  controllers: [AppointmentsController],
  providers: [AppointmentService],
})
export class AppointmentsModule {}
