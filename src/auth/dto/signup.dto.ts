import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['doctor', 'patient'])
  role: 'doctor' | 'patient';

  // optional profile fields (used conditionally)
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  age?: number;

  @IsOptional()
  @IsString()
  gender?: 'MALE' | 'FEMALE' | 'OTHERS';

  @IsOptional()
  @IsString()
  address?: string;
}
