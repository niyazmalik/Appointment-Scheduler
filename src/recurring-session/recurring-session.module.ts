import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecurringSession } from 'src/entities/recurring-session.entity';
import { Session } from 'src/entities/session.entity';
import { Doctor } from 'src/entities/doctor.entity';
import { RecurringSessionService } from './recurring-session.service';
import { RecurringSessionController } from './recurring-session.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringSession, Session, Doctor]),
  ],
  providers: [RecurringSessionService],
  controllers: [RecurringSessionController],
})
export class RecurringSessionModule {}
