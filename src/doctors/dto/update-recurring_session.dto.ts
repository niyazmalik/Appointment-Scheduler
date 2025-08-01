import { PartialType } from '@nestjs/mapped-types';
import { CreateRecurringSessionDto } from './create-recurring_session.dto';

export class UpdateRecurringSessionDto extends PartialType(CreateRecurringSessionDto) {}
