import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScientificStructureRequests1790452800000 implements MigrationInterface {
  name = 'ScientificStructureRequests1790452800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "scientific_structure_requests" (
        "id" uuid PRIMARY KEY,
        "requested_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "parent_category_id" uuid REFERENCES "categories"("id") ON DELETE SET NULL,
        "proposed_category_name" varchar(160),
        "proposed_record_type_name" varchar(160),
        "reason" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "resolution_note" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_scientific_structure_requests_proposal" CHECK (
          "proposed_category_name" IS NOT NULL OR "proposed_record_type_name" IS NOT NULL
        ),
        CONSTRAINT "ck_scientific_structure_requests_status" CHECK (
          "status" IN ('pending', 'reviewed', 'accepted', 'rejected')
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_scientific_structure_requests_status_created" ON "scientific_structure_requests" ("status", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "scientific_structure_requests"');
  }
}
