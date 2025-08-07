import { Module } from '@nestjs/common';
import { GreetModule } from './greet/greet.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Slot } from './entities/slot.entity';
import { Appointment } from './entities/appointment.entity';
import { PatientsModule } from './patients/patients.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { Session } from './entities/session.entity';
import { RecurringSession } from './entities/recurring-session.entity';
import { RecurringSessionModule } from './recurring-session/recurring-session.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: parseInt(configService.get<string>('DATABASE_PORT') || '5432'),
        username: configService.get<string>('DATABASE_USER') || 'neondb_owner',
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME') || 'healthcare_backend_db',
        entities: [User, Doctor, Patient, Slot, Appointment, Session, RecurringSession],
        synchronize: false,
        logging: false,
        retryAttempts: 3,
        retryDelay: 3000,
        autoLoadEntities: true,
        ssl: configService.get<string>('DATABASE_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
      inject: [ConfigService],
    }),
    GreetModule,
    AuthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    RecurringSessionModule
  ],
 })
export class AppModule {}
