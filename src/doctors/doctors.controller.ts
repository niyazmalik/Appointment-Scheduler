import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { CreateSlotDto } from './dto/create-slot.dto';

import { Request } from 'express';
import { User } from 'src/entities/user.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Controller('/api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) { }

  @Get()
  async getAllDoctors(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.doctorsService.getAllDoctors(search, +page, +limit);
  }

  @Post('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async createSession(@Req() req: Request, @Body() dto: CreateSessionDto) {
    const user = req.user as User;
    return this.doctorsService.createSession(user.id, dto);
  }

  @Post('sessions/:id/slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async createSlot(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: Request,
    @Body() dto: CreateSlotDto
  ) {
    const user = req.user as User;
    return this.doctorsService.createSlotInSession(user.id, sessionId, dto);
  }

  @Patch('sessions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async updateSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateSessionDto,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.doctorsService.updateSession(user.id, sessionId, dto);
  }

}
