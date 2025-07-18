import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from 'src/entities/user.entity';
import { Patient } from 'src/entities/patient.entity';
import { Appointment } from 'src/entities/appointment.entity';
import { Slot } from 'src/entities/slot.entity';
import { Doctor } from 'src/entities/doctor.entity';
dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  username: process.env.DATABASE_USER || "neondb_owner",
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || "healthcare_backend_db",
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [User, Patient, Appointment, Slot, Doctor],
  migrations: ['src/database/migrations/*.ts'],
});
