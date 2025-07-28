import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { Doctor } from '../entities/doctor.entity';
import { Slot } from 'src/entities/slot.entity';
import { Session } from 'src/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, Slot, Session])],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
