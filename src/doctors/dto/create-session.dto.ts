import { IsEnum, IsInt, Min, Matches } from 'class-validator';
import { DayOfWeek } from '../../entities/session.entity';

export class CreateSessionDto {
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'start_time must be in HH:MM 24-hour format',
  })
  consult_start_time: string;

  @Matches(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/, {
    message: 'end_time must be in HH:MM 24-hour format',
  })
  consult_end_time: string;

}
