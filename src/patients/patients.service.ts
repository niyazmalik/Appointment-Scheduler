import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class PatientsService {
    constructor(
        @InjectRepository(Patient)
        private readonly patientRepo: Repository<Patient>,
    ) { }

    async getAllPatients(search = '', page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [data, total] = await this.patientRepo.findAndCount({
            where: [
                { user: { name: ILike(`%${search}%`) } },
                { user: { email: ILike(`%${search}%`) } },
                { user: { phone_number: ILike(`%${search}%`) } },
            ],
            relations: ['user'],
            skip,
            take: limit,
            order: { id: 'DESC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getPatientById(id: string) {
        const patient = await this.patientRepo.findOne({
            where: { id },
            relations: ['user', 'appointments'],
        });

        if (!patient) {
            throw new NotFoundException('Patient not found');
        }

        return patient;
    }
}
