import { MigrationInterface, QueryRunner } from 'typeorm';

export class ManagedResearchReferences1790546400000 implements MigrationInterface {
  name = 'ManagedResearchReferences1790546400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "scientific_references" DROP CONSTRAINT "ck_scientific_references_traceable"',
    );
    await queryRunner.query(`
      ALTER TABLE "scientific_references"
      ADD CONSTRAINT "ck_scientific_references_traceable" CHECK (
        "identifier" IS NOT NULL OR "source_url" IS NOT NULL OR "publication" IS NOT NULL
        OR "research_publication_id" IS NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "scientific_references" DROP CONSTRAINT "ck_scientific_references_traceable"',
    );
    await queryRunner.query(`
      ALTER TABLE "scientific_references"
      ADD CONSTRAINT "ck_scientific_references_traceable" CHECK (
        "identifier" IS NOT NULL OR "source_url" IS NOT NULL OR "publication" IS NOT NULL
      )
    `);
  }
}
