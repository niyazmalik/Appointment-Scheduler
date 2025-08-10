import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Request } from 'express';
import { User } from 'src/entities/user.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RecurringSessionService } from './recurring-session.service';

@Controller('recurring-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecurringSessionController {
  constructor(private readonly recurringSessionService: RecurringSessionService) {}

  @Get('generate')
  @Roles('doctor')
  async generateSessions(
    @Query('days') daysAhead = 7,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.recurringSessionService.generateSessions(+daysAhead, user.id);
  }
}
