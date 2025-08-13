import {
  Controller,
  Query,
  UseGuards,
  Req,
  Post,
  Body,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Request } from 'express';
import { User } from 'src/entities/user.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RecurringSessionService } from './recurring-session.service';
import { CreateRecurringSessionDto } from './create-recurring-session.dto';

@Controller('recurring-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecurringSessionController {
  constructor(private readonly recurringSessionService: RecurringSessionService) { }

  @Post('generate')
  @Roles('doctor')
  async generateSessions(
    @Query('days') daysAhead = 7,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.recurringSessionService.generateSessions(+daysAhead, user.id);
  }

  @Post('create')
  @Roles('doctor')
  async createRecurringSession(
    @Body() dto: CreateRecurringSessionDto,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.recurringSessionService.create(user.id, dto);
  }

}
