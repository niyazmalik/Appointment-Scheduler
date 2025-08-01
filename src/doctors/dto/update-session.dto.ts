import { PartialType } from '@nestjs/mapped-types';
import { CreateSessionDto } from './create-session.dto';
import { IsInt, Min, IsOptional } from 'class-validator';

export class UpdateSessionDto extends PartialType(CreateSessionDto) {
  @IsOptional()
  @IsInt()
  @Min(1)
  min_consult_time?: number;
}
