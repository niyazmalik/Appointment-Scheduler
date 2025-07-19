import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DoctorSignupDto } from './dto/doctor-signup.dto';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { LoginDto } from './dto/login.dto';
import { BaseSignupDto } from './dto/base-signup.dto';
import { GetCurrentUser } from 'src/common/decorators/get-user.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';


@Controller('/api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signup(@Body() body: any) {
    const baseDto = plainToInstance(BaseSignupDto, body); // First validate base structure...
    const baseErrors = await validate(baseDto);
    if (baseErrors.length > 0) {
      throw new BadRequestException(baseErrors);
    }

    // Now based on role, validate appropriate DTO
    if (baseDto.role === 'doctor') {
      const doctorDto = plainToInstance(DoctorSignupDto, body);
      const doctorErrors = await validate(doctorDto);
      if (doctorErrors.length > 0) throw new BadRequestException(doctorErrors);
      return this.authService.signupDoctor(doctorDto);
    }

    if (baseDto.role === 'patient') {
      const patientDto = plainToInstance(PatientSignupDto, body);
      const patientErrors = await validate(patientDto);
      if (patientErrors.length > 0) throw new BadRequestException(patientErrors);
      return this.authService.signupPatient(patientDto);
    }

    throw new BadRequestException('Invalid role');
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@GetCurrentUser() user: { id: string; role: string }) {
    return this.authService.getProfile(user.id, user.role);
  }
}
