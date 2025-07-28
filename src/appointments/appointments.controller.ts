import { Controller, Post, Body, UseGuards, Req, Query, Get, Param, Patch, ParseUUIDPipe } from '@nestjs/common';
import { AppointmentService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Request } from 'express';
import { User } from 'src/entities/user.entity';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

@Controller('api/appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
    constructor(private readonly appointmentsService: AppointmentService) { }

    @Post()
    @Roles('patient')
    async createAppointment(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
        const user = req.user as User;
        return this.appointmentsService.createAppointment(user.id, dto);
    }

    @Patch(':id/reschedule')
    @Roles('patient')
    async rescheduleAppointment(
        @Param('id') id: string,
        @Req() req: Request,
        @Body() dto: RescheduleAppointmentDto,
    ) {
        const user = req.user as User;
        return this.appointmentsService.rescheduleAppointment(id, user.id, dto);
    }

    @Get(':id')
    async getAppointmentById(
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.appointmentsService.getAppointmentById(id);
    }
}
