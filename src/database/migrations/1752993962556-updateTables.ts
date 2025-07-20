import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTables1752993962556 implements MigrationInterface {
    name = 'UpdateTables1752993962556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" ADD "is_booked" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "is_booked"`);
    }

}
