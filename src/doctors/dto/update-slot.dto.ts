// src/doctors/dto/update-slot.dto.ts
import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Weekday } from 'src/entities/slot.entity';

export class UpdateSlotDto {
  @IsOptional()
  @IsEnum(Weekday)
  day?: Weekday;

  @IsOptional()
  @IsString()
  start_time?: string;

  @IsOptional()
  @IsString()
  end_time?: string;

  @IsOptional()
  @IsBoolean()
  is_booked?: boolean;

  @IsOptional()
  @IsNumber()
  max_bookings?: number;
}
