import { IsString, IsOptional } from 'class-validator';

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
