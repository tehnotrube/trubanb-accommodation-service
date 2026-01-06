import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccommodationEntity1767709686038 implements MigrationInterface {
    name = 'AddAccommodationEntity1767709686038'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "accommodations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "location" character varying NOT NULL, "amenities" text array NOT NULL DEFAULT '{}', "minGuests" integer NOT NULL DEFAULT '1', "maxGuests" integer NOT NULL DEFAULT '1', "hostId" character varying NOT NULL, "autoApprove" boolean NOT NULL DEFAULT false, "basePrice" numeric(10,2) NOT NULL, CONSTRAINT "PK_a422a200297f93cd5ac87d049e8" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "accommodations"`);
    }

}
