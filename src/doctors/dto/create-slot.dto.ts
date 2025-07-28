import { IsEnum, IsNotEmpty, IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateSlotDto {

  @IsString()
  @IsNotEmpty()
  start_time: string;

  @IsString()
  @IsNotEmpty()
  end_time: string;

  @IsInt()
  @Min(1)
  avg_consult_time: number;

  @IsOptional()
  @IsNumber()
  max_bookings?: number;
}
