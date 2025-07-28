import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablesupdate1753702619276 implements MigrationInterface {
    name = 'Tablesupdate1753702619276'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "start_time"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "end_time"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "booking_cutoff_minutes"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "consult_start_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "consult_end_time" TIME NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "consult_end_time"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "consult_start_time"`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "booking_cutoff_minutes" integer NOT NULL DEFAULT '60'`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "end_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "start_time" TIME NOT NULL`);
    }

}
