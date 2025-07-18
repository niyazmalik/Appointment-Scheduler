import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { SignupDto } from './dto/signup.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Doctor) private doctorRepo: Repository<Doctor>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    private jwtService: JwtService
  ) {}

  async signup(dto: SignupDto) {
    const { email, phone_number, password, role } = dto;

    const exists = await this.userRepo.findOne({ where: [{ email }, { phone_number }] });
    if (exists) throw new ConflictException('User already exists');

    const hashed = await bcrypt.hash(password, 10);

    const user = this.userRepo.create({
      name: dto.name,
      email,
      phone_number,
      password: hashed,
      role,
    });

    await this.userRepo.save(user);

    if (role === 'doctor') {
      const doctor = this.doctorRepo.create({
        user,
        specialization: dto.specialization,
        bio: dto.bio,
      });
      await this.doctorRepo.save(doctor);
    }

    if (role === 'patient') {
      const patient = this.patientRepo.create({
        user,
        age: dto.age,
        gender: dto.gender,
        address: dto.address,
      });
      await this.patientRepo.save(patient);
    }

    const payload = { sub: user.id, role: user.role };
    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Signup successful',
      token,
    };
  }
  async login(dto: LoginDto) {
  const { email, password } = dto;

  if (!email) {
    throw new UnauthorizedException('Email or phone number is required');
  }

  const user = await this.userRepo.findOne({
    where: { email }
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedException('Invalid credentials');
  }

  const payload = { sub: user.id, role: user.role };
  const token = await this.jwtService.signAsync(payload);

  return {
    message: 'Login successful',
    token,
  };
}
}
