// src/doctors/dto/create-slot.dto.ts
import { IsEnum, IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';
import { Weekday } from 'src/entities/slot.entity';

export class CreateSlotDto { // I have not included is_booked beacuse by default it is false.
  @IsEnum(Weekday)
  @IsNotEmpty()
  day: Weekday;

  @IsString()
  @IsNotEmpty()
  start_time: string;

  @IsString()
  @IsNotEmpty()
  end_time: string;

  @IsOptional()
  @IsNumber()
  max_bookings?: number;
}
