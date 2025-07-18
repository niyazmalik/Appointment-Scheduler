import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllTheTablesAgain1752845968146 implements MigrationInterface {
    name = 'CreateAllTheTablesAgain1752845968146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "created_at" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('confirmed', 'cancelled', 'rescheduled')`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'confirmed'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "status" character varying NOT NULL DEFAULT 'confirmed'`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "createdAt" TIMESTAMP`);
    }

}
