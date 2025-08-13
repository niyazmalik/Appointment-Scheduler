import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTables1755078448519 implements MigrationInterface {
    name = 'UpdateTables1755078448519'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_sessions" RENAME COLUMN "booking_end_time" TO "booking_start_time"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_sessions" RENAME COLUMN "booking_start_time" TO "booking_end_time"`);
    }

}
