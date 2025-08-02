import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAndCreateTables1754103921928 implements MigrationInterface {
    name = 'UpdateAndCreateTables1754103921928'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "patients" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "age" integer, "gender" character varying, "address" character varying, "userId" uuid, CONSTRAINT "REL_2c24c3490a26d04b0d70f92057" UNIQUE ("userId"), CONSTRAINT "PK_a7f0b9fcbb3469d5ec0b0aceaa7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'confirmed', "appointment_reason" character varying, "cancellation_reason" character varying, "reporting_time" TIME, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "patient_id" uuid, "slot_id" uuid, CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."day_of_week" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`CREATE TABLE "recurring_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "day" "public"."day_of_week" NOT NULL, "consult_start_time" TIME NOT NULL, "consult_end_time" TIME NOT NULL, "booking_start_time" TIME NOT NULL, "booking_end_time" TIME NOT NULL, "avg_consult_time" integer NOT NULL DEFAULT '10', "is_active" boolean NOT NULL DEFAULT true, "doctor_id" uuid, CONSTRAINT "PK_0a38105d4f373732116bf8aa159" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."session_day" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "day" "public"."session_day" NOT NULL, "date" date NOT NULL, "consult_start_time" TIME NOT NULL, "consult_end_time" TIME NOT NULL, "booking_start_time" TIME NOT NULL, "booking_end_time" TIME NOT NULL, "avg_consult_time" integer NOT NULL DEFAULT '10', "is_active" boolean NOT NULL DEFAULT true, "is_modified" boolean NOT NULL DEFAULT false, "doctor_id" uuid, "recurring_session_id" uuid, CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "slots" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "start_time" TIME NOT NULL, "end_time" TIME NOT NULL, "is_booked" boolean NOT NULL DEFAULT false, "max_bookings" integer NOT NULL DEFAULT '1', "session_id" uuid, "doctor_id" uuid, CONSTRAINT "PK_8b553bb1941663b63fd38405e42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "doctors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "specialization" character varying, "bio" character varying, "userId" uuid, CONSTRAINT "REL_55651e05e46413d510215535ed" UNIQUE ("userId"), CONSTRAINT "PK_8207e7889b50ee3695c2b8154ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "phone_number" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2" UNIQUE ("phone_number"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "FK_2c24c3490a26d04b0d70f92057a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_3330f054416745deaa2cc130700" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_b1ccdd43ac8ccbb787c68a64a13" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_sessions" ADD CONSTRAINT "FK_469540082df72a46960de209c64" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_348ee0ff980879d47e6e5c435c7" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_2ae230d4252ed287f9c83228a4f" FOREIGN KEY ("recurring_session_id") REFERENCES "recurring_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_1a9a479a2c81d0760291354415f" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_e49d815e5bbd15b0f0a83c4b700" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "FK_55651e05e46413d510215535edf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctors" DROP CONSTRAINT "FK_55651e05e46413d510215535edf"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_e49d815e5bbd15b0f0a83c4b700"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_1a9a479a2c81d0760291354415f"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_2ae230d4252ed287f9c83228a4f"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_348ee0ff980879d47e6e5c435c7"`);
        await queryRunner.query(`ALTER TABLE "recurring_sessions" DROP CONSTRAINT "FK_469540082df72a46960de209c64"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_b1ccdd43ac8ccbb787c68a64a13"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_3330f054416745deaa2cc130700"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_2c24c3490a26d04b0d70f92057a"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "doctors"`);
        await queryRunner.query(`DROP TABLE "slots"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP TYPE "public"."session_day"`);
        await queryRunner.query(`DROP TABLE "recurring_sessions"`);
        await queryRunner.query(`DROP TYPE "public"."day_of_week"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TABLE "patients"`);
    }

}
