import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BaseSignupDto } from './base-signup.dto';

export class DoctorSignupDto extends BaseSignupDto {
  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsString()
  @IsOptional()
  bio?: string;
}
