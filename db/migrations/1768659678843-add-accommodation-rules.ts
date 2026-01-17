import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccommodationRules1768659678843 implements MigrationInterface {
    name = 'AddAccommodationRules1768659678843'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "accommodation_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "accommodationId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "overridePrice" numeric(10,2), "multiplier" numeric(5,2) NOT NULL DEFAULT '1', "periodType" character varying, CONSTRAINT "PK_d804a7701d6948580d8b86ef4f6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "blocked_periods" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "accommodationId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "reason" character varying NOT NULL, "reservationId" character varying, CONSTRAINT "PK_dc4f58353bfb9ed812f8ba66327" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "accommodations" ADD "isPerUnit" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "accommodation_rules" ADD CONSTRAINT "FK_fa9d4dca3f7c21c59ef0125bc25" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "blocked_periods" ADD CONSTRAINT "FK_2c9693f3e9deed5ed5b9850547d" FOREIGN KEY ("accommodationId") REFERENCES "accommodations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "blocked_periods" DROP CONSTRAINT "FK_2c9693f3e9deed5ed5b9850547d"`);
        await queryRunner.query(`ALTER TABLE "accommodation_rules" DROP CONSTRAINT "FK_fa9d4dca3f7c21c59ef0125bc25"`);
        await queryRunner.query(`ALTER TABLE "accommodations" DROP COLUMN "isPerUnit"`);
        await queryRunner.query(`DROP TABLE "blocked_periods"`);
        await queryRunner.query(`DROP TABLE "accommodation_rules"`);
    }

}
