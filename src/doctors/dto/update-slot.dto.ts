import { IsEnum, IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';

export class UpdateSlotDto {

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
