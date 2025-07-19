import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class BaseSignupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(['doctor', 'patient'])
  @IsNotEmpty()
  role: 'doctor' | 'patient';
}
