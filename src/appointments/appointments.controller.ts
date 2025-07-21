import { Controller, Post, Body, UseGuards, Req, Query, Get, Param, Patch } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
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
    constructor(private readonly appointmentsService: AppointmentsService) { }

    @Post()
    @Roles('patient')
    async createAppointment(@Req() req: Request, @Body() dto: CreateAppointmentDto) {
        const user = req.user as User;
        return this.appointmentsService.createAppointment(user.id, dto);
    }

    @Get()
    async getAllAppointments(
        @Req() req: Request,
        @Query('status') status?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        const user = req.user as User;
        return this.appointmentsService.getAllAppointments(user.id, user.role, status, +page, +limit);
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

    @Patch(':id/cancel')
    @Roles('patient')
    cancelAppointment(
        @Param('id') id: string,
        @Body() dto: CancelAppointmentDto,
        @Req() req: Request,
    ) {
        const user = req.user as User;
        return this.appointmentsService.cancelAppointment(id, user.id, dto);
    }


    @Get(':id')
    async getAppointmentById(@Param('id') id: string) {
        return this.appointmentsService.getAppointmentById(id);
    }

}
