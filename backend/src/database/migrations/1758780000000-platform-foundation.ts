import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlatformFoundation1758780000000 implements MigrationInterface {
  name = 'PlatformFoundation1758780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await queryRunner.query(`
      CREATE TABLE "platform_settings" (
        "key" varchar(100) PRIMARY KEY,
        "value" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "platform_settings"');
  }
}
