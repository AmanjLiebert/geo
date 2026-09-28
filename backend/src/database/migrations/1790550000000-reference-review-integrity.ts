import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReferenceReviewIntegrity1790550000000 implements MigrationInterface {
  name = 'ReferenceReviewIntegrity1790550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "scientific_references"
      ADD CONSTRAINT "ck_scientific_references_independent_verification" CHECK (
        "verification_status" <> 'verified'
        OR ("verified_by_user_id" IS NOT NULL AND "verified_by_user_id" <> "created_by_user_id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "scientific_references" DROP CONSTRAINT IF EXISTS "ck_scientific_references_independent_verification"',
    );
  }
}
