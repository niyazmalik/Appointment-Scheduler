import { IsEnum, IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';
import { DayOfWeek } from 'src/enums/day.enum';

export class CreateRecurringSessionDto {
  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  day: DayOfWeek;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  consult_start_time: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  consult_end_time: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  booking_start_time: string;

  @IsNumber()
  @Min(1)
  avg_consult_time: number;

  @IsNumber()
  @Min(1)
  slot_duration: number;
}
