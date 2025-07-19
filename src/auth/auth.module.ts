import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/common/strategies/jwt.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Doctor, Patient]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
