import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { Doctor } from '../entities/doctor.entity';
import { Slot } from 'src/entities/slot.entity';
import { Session } from 'src/entities/session.entity';
import { Appointment } from 'src/entities/appointment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Slot, Session, Appointment])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}