import { MigrationInterface, QueryRunner } from "typeorm";

export class Update1753698856880 implements MigrationInterface {
    name = 'Update1753698856880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_074c4e87da10ac958c44c9562f3"`);
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_58f86e95ea77a4c7c4aec98e6a2"`);
        await queryRunner.query(`ALTER TABLE "appointments" RENAME COLUMN "slotId" TO "slot_id"`);
        await queryRunner.query(`ALTER TABLE "slots" RENAME COLUMN "doctorId" TO "doctor_id"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_b1ccdd43ac8ccbb787c68a64a13" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_e49d815e5bbd15b0f0a83c4b700" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "slots" DROP CONSTRAINT "FK_e49d815e5bbd15b0f0a83c4b700"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_b1ccdd43ac8ccbb787c68a64a13"`);
        await queryRunner.query(`ALTER TABLE "slots" RENAME COLUMN "doctor_id" TO "doctorId"`);
        await queryRunner.query(`ALTER TABLE "appointments" RENAME COLUMN "slot_id" TO "slotId"`);
        await queryRunner.query(`ALTER TABLE "slots" ADD CONSTRAINT "FK_58f86e95ea77a4c7c4aec98e6a2" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_074c4e87da10ac958c44c9562f3" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
