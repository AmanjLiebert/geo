import { MigrationInterface, QueryRunner } from 'typeorm';

export class CategoryDraftRevisions1792046400000 implements MigrationInterface {
  name = 'CategoryDraftRevisions1792046400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE category_draft_revisions (
        category_id uuid PRIMARY KEY REFERENCES categories(id) ON DELETE RESTRICT,
        title varchar(160) NOT NULL,
        summary varchar(500) NOT NULL,
        description text NOT NULL,
        image_media_asset_id uuid REFERENCES media_assets(id) ON DELETE RESTRICT,
        position integer NOT NULL CHECK (position >= 0),
        edited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_category_revision_title CHECK (length(btrim(title)) >= 2),
        CONSTRAINT ck_category_revision_summary CHECK (length(btrim(summary)) >= 2),
        CONSTRAINT ck_category_revision_description CHECK (length(btrim(description)) >= 2 AND length(description) <= 4000)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE category_draft_revision_history (
        id uuid PRIMARY KEY,
        category_id uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        title varchar(160) NOT NULL,
        summary varchar(500) NOT NULL,
        description text NOT NULL,
        image_media_asset_id uuid REFERENCES media_assets(id) ON DELETE RESTRICT,
        position integer NOT NULL,
        edited_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_category_draft_revision_history_category ON category_draft_revision_history (category_id, created_at DESC)`,
    );
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error('Category draft revisions require a reviewed forward recovery migration.'),
    );
  }
}
