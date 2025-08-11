import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTables1754928778706 implements MigrationInterface {
    name = 'UpdateTables1754928778706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_sessions" ADD "slot_duration" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD "slot_duration" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "slot_duration"`);
        await queryRunner.query(`ALTER TABLE "recurring_sessions" DROP COLUMN "slot_duration"`);
    }

}
