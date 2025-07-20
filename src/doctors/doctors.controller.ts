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
import { Weekday } from 'src/entities/slot.entity';

interface AuthRequest extends Request {
  user: any;
}

@Controller('/api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async getAllDoctors(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.doctorsService.getAllDoctors(search, +page, +limit);
  }

  @Post('slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async createSlot(@Req() req: Request, @Body() dto: CreateSlotDto) {
    const user = req.user as User;
    return this.doctorsService.createSlot(user.id, dto);
  }

  @Get('slots')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async getOwnSlots(@Req() req: Request) {
    const user = req.user as User;
    return this.doctorsService.getOwnSlotsByUserId(user.id);
  }
  
  @Get(':id/slots')
  @UseGuards(JwtAuthGuard)
  async getDoctorSlots(
    @Param('id') doctorId: string,
     @Query('day') day?: Weekday
 ) {
    return this.doctorsService.getDoctorSlots(doctorId, day);
 }

  @Get('slots/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async getSlotById(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.getSlotById(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDoctorById(@Param('id') id: string) {
    return this.doctorsService.getDoctorById(id);
  }

  @Patch('slots/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async updateSlot(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlotDto,
  ) {
    return this.doctorsService.updateSlot(id, dto);
  }

  @Delete('slots/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  async deleteSlot(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.deleteSlot(id);
  }
}
