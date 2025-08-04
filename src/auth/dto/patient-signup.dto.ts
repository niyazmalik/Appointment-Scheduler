import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { BaseSignupDto } from './base-signup.dto';

export class PatientSignupDto extends BaseSignupDto {  
  @IsNumber()
  @IsNotEmpty()
  age: number;

  @IsString()
  @IsNotEmpty()
  gender: 'MALE' | 'FEMALE';

  @IsString()
  @IsOptional()
  address?: string;
}
