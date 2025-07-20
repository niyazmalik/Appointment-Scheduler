import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';

@Controller('/api/patients')
export class PatientsController {
    constructor(private readonly patientsService: PatientsService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllPatients(
        @Query('search') search?: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        return this.patientsService.getAllPatients(search, +page, +limit);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getPatientById(@Param('id') id: string) {
        return this.patientsService.getPatientById(id);
    }

}
