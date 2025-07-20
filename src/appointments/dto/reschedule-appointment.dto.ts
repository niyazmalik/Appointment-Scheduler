import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @IsUUID()
  new_slot_id: string;

  @IsOptional()
  @IsString()
  appointment_reason?: string;
}
