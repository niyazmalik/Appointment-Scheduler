import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { DoctorSignupDto } from './dto/doctor-signup.dto';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { LoginDto } from './dto/login.dto';
import { BaseSignupDto } from './dto/base-signup.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    private jwtService: JwtService,
  ) { }

  private async createUser(dto: BaseSignupDto): Promise<User> {
    const { name, email, password, role, phone_number } = dto;

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      name,
      email,
      phone_number,
      password: hashedPassword,
      role,
    });

    return await this.userRepo.save(user);
  }

  async signupDoctor(dto: DoctorSignupDto) {
    const user = await this.createUser(dto);

    const doctor = this.doctorRepo.create({
      user,
      specialization: dto.specialization,
      bio: dto.bio,
    });

    await this.doctorRepo.save(doctor);

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    return {
      message: 'Doctor signup successful',
      token,
    };
  }

  async signupPatient(dto: PatientSignupDto) {
    const user = await this.createUser(dto);

    const patient = this.patientRepo.create({
      user,
      age: dto.age,
      gender: dto.gender,
      address: dto.address,
    });

    await this.patientRepo.save(patient);

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    return {
      message: 'Patient signup successful',
      token,
    };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      role: user.role,
    });

    return {
      message: 'Login successful',
      token,
    };
  }

  async getProfile(userId: string, role: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'phone_number', 'role'], // exclude password
    });

    if (!user) throw new UnauthorizedException('User not found');

    if (role === 'doctor') {
      const doctor = await this.doctorRepo.findOne({
        where: { user: { id: userId } },
        select: ['id', 'specialization', 'bio'], // must include 'id' explicitly when using select
      });

      if (!doctor) {
        throw new UnauthorizedException('Doctor profile not found');
      }

      return {
        ...user,
        doctor_profile: doctor,
      };
    }


    if (role === 'patient') {
      const patient = await this.patientRepo.findOne({
        where: { user: { id: userId } },
        select: ['id', 'age', 'gender', 'address'], // must include 'id' explicitly when using select
      });

      if (!patient) {
        throw new UnauthorizedException('Patient profile not found');
      }

      return {
        ...user,
        patient_profile: patient,
      };
    }
  }

}
