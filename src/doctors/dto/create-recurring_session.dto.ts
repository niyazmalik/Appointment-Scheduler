import { IsEnum, IsInt, Matches, Min } from 'class-validator';
import { DayOfWeek } from '../../entities/session.entity';

export class CreateRecurringSessionDto {
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  consult_start_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  consult_end_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  booking_start_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/)
  booking_end_time: string;

  @IsInt()
  @Min(1)
  avg_consult_time: number;
}
