import { IsNotEmpty, IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateSlotDto {

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
