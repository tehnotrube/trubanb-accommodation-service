import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhotosUrls1768244940592 implements MigrationInterface {
    name = 'AddPhotosUrls1768244940592'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accommodations" ADD "photoKeys" text array NOT NULL DEFAULT '{}'`);
        await queryRunner.query(`ALTER TABLE "accommodations" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "accommodations" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accommodations" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "accommodations" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "accommodations" DROP COLUMN "photoKeys"`);
    }

}
