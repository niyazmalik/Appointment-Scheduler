import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllTheTablesAgainn1752846913101 implements MigrationInterface {
    name = 'CreateAllTheTablesAgainn1752846913101'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" RENAME COLUMN "reason" TO "description"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "startTime"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "endTime"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "mode"`);
        await queryRunner.query(`DROP TYPE "public"."slots_mode_enum"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "maxBookings"`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "start_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "end_time" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "max_bookings" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "max_bookings"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "maxBookings" integer`);
        await queryRunner.query(`CREATE TYPE "public"."slots_mode_enum" AS ENUM('stream', 'wave')`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "mode" "public"."slots_mode_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "endTime" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "startTime" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" RENAME COLUMN "description" TO "reason"`);
    }

}
