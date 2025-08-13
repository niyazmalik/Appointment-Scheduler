import { IsEnum, IsInt, IsBoolean, IsOptional, Min, Matches, IsString, IsDateString } from 'class-validator';
import { DayOfWeek } from 'src/enums/day.enum';

export class CreateSessionDto {
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  consult_start_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  consult_end_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  booking_start_time: string;

  @IsInt()
  @Min(1)
  avg_consult_time: number;

  @IsInt()
  @Min(1)
  slot_duration: number;

  @IsOptional()
  @IsString()
  recurring_template?: string;

  @IsDateString()
  session_date: string; 

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
