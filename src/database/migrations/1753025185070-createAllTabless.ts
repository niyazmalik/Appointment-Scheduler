import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAllTabless1753025185070 implements MigrationInterface {
    name = 'CreateAllTabless1753025185070'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "max_bookings" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "max_bookings" SET DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "max_bookings" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "slots" ALTER COLUMN "max_bookings" DROP NOT NULL`);
    }

}
