import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTables1754887088302 implements MigrationInterface {
    name = 'UpdateTables1754887088302'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_sessions" DROP COLUMN "booking_start_time"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "booking_end_time"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" ADD "booking_end_time" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "recurring_sessions" ADD "booking_start_time" TIME NOT NULL`);
    }

}
