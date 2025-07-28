import { MigrationInterface, QueryRunner } from "typeorm";

export class Tables1753702204242 implements MigrationInterface {
    name = 'Tables1753702204242'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'confirmed', "appointment_reason" character varying, "cancellation_reason" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "patient_id" uuid, "slot_id" uuid, CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "day" "public"."sessions_day_enum" NOT NULL, "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "booking_cutoff_minutes" integer NOT NULL DEFAULT '60', "is_active" boolean NOT NULL DEFAULT true, "doctor_id" uuid, CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "is_booked" boolean NOT NULL DEFAULT false, "avg_consult_time" integer NOT NULL DEFAULT '10', "max_bookings" integer NOT NULL DEFAULT '1', "session_id" uuid, "doctor_id" uuid, CONSTRAINT "PK_8b553bb1941663b63fd38405e42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_3330f054416745deaa2cc130700" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_b1ccdd43ac8ccbb787c68a64a13" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_348ee0ff980879d47e6e5c435c7" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_1a9a479a2c81d0760291354415f" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_e49d815e5bbd15b0f0a83c4b700" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_e49d815e5bbd15b0f0a83c4b700"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_1a9a479a2c81d0760291354415f"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_348ee0ff980879d47e6e5c435c7"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_b1ccdd43ac8ccbb787c68a64a13"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_3330f054416745deaa2cc130700"`);
        await queryRunner.query(`DROP TABLE "slots"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
    }

}
