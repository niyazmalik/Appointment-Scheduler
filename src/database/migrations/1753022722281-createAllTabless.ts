import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllTabless1753022722281 implements MigrationInterface {
    name = 'CreateAllTabless1753022722281'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "cancel_before_hours"`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "cancel_before_hours" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP COLUMN "cancel_before_hours"`);
        await queryRunner.query(`ALTER TABLE "slots" ADD "cancel_before_hours" TIMESTAMP`);
    }

}
