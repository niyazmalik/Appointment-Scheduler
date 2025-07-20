import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  slot_id: string;

  @IsOptional()
  @IsString()
  appointment_reason?: string;
}
