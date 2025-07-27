import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSlotTable1753591798101 implements MigrationInterface {
    name = 'UpdateSlotTable1753591798101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'confirmed', "appointment_reason" character varying, "cancellation_reason" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "patientId" uuid, "slotId" uuid, CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "day" "public"."slots_day_enum" NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "cancel_before_hours" integer, "is_booked" boolean NOT NULL DEFAULT false, "max_bookings" integer NOT NULL DEFAULT '1', "booking_start_at" TIMESTAMP NOT NULL, "booking_end_at" TIMESTAMP NOT NULL, "doctorId" uuid, CONSTRAINT "PK_8b553bb1941663b63fd38405e42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "scheduling_type"`);
        await queryRunner.query(`DROP TYPE "public"."doctors_scheduling_type_enum"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_074c4e87da10ac958c44c9562f3" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_58f86e95ea77a4c7c4aec98e6a2" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_58f86e95ea77a4c7c4aec98e6a2"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_074c4e87da10ac958c44c9562f3"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d"`);
        await queryRunner.query(`CREATE TYPE "public"."doctors_scheduling_type_enum" AS ENUM('wave', 'stream')`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "scheduling_type" "public"."doctors_scheduling_type_enum" NOT NULL DEFAULT 'wave'`);
        await queryRunner.query(`DROP TABLE "slots"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
    }

}
