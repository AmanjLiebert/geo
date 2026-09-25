import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdentityAndAccess1790355000000 implements MigrationInterface {
  name = 'IdentityAndAccess1790355000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "app_role" AS ENUM ('visitor', 'teacher', 'admin')`);
    await queryRunner.query(`CREATE TYPE "user_status" AS ENUM ('active', 'disabled')`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY,
        "role" "app_role" NOT NULL DEFAULT 'visitor',
        "status" "user_status" NOT NULL DEFAULT 'active',
        "display_name" varchar(160),
        "email" varchar(320),
        "phone" varchar(32),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "last_signed_in_at" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_role_status" ON "users" ("role", "status")`);
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" (lower("email")) WHERE "email" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "external_identities" (
        "id" uuid PRIMARY KEY,
        "provider" varchar(40) NOT NULL,
        "provider_subject" varchar(191) NOT NULL,
        "sign_in_provider" varchar(80),
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_external_identity_provider_subject" UNIQUE ("provider", "provider_subject")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_external_identities_user" ON "external_identities" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid PRIMARY KEY,
        "token_hash" char(64) NOT NULL,
        "csrf_token_hash" char(64) NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "provider_subject" varchar(191) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "reauthenticated_at" timestamptz NOT NULL,
        "mfa_verified_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "last_seen_at" timestamptz NOT NULL DEFAULT now(),
        "revoked_at" timestamptz
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_user_sessions_token_hash" ON "user_sessions" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_sessions_active" ON "user_sessions" ("user_id", "expires_at") WHERE "revoked_at" IS NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "stable_key" varchar(100) PRIMARY KEY,
        "description" varchar(240) NOT NULL,
        "risk_level" varchar(20) NOT NULL,
        CONSTRAINT "ck_permissions_risk" CHECK ("risk_level" IN ('standard', 'elevated', 'high'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role" "app_role" NOT NULL,
        "permission_key" varchar(100) NOT NULL REFERENCES "permissions"("stable_key") ON DELETE RESTRICT,
        PRIMARY KEY ("role", "permission_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "identity_invitations" (
        "id" uuid PRIMARY KEY,
        "token_hash" char(64) NOT NULL,
        "role" "app_role" NOT NULL,
        "recipient_type" varchar(16) NOT NULL,
        "recipient_normalized" varchar(320) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "created_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "accepted_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NOT NULL,
        "accepted_at" timestamptz,
        "revoked_at" timestamptz,
        CONSTRAINT "uq_identity_invitations_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "ck_identity_invitations_privileged_role" CHECK ("role" IN ('teacher', 'admin')),
        CONSTRAINT "ck_identity_invitations_recipient_type" CHECK ("recipient_type" IN ('email', 'phone')),
        CONSTRAINT "ck_identity_invitations_status" CHECK ("status" IN ('pending', 'accepted', 'revoked', 'expired'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_identity_invitations_pending" ON "identity_invitations" ("recipient_normalized", "expires_at") WHERE "status" = 'pending'`,
    );

    await queryRunner.query(`
      CREATE TABLE "security_audit_events" (
        "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        "actor_user_id" uuid,
        "action" varchar(100) NOT NULL,
        "target_type" varchar(60) NOT NULL,
        "target_id" varchar(191),
        "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_security_audit_events_target" ON "security_audit_events" ("target_type", "target_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_security_audit_events_actor" ON "security_audit_events" ("actor_user_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "security_audit_events"');
    await queryRunner.query('DROP TABLE IF EXISTS "identity_invitations"');
    await queryRunner.query('DROP TABLE IF EXISTS "role_permissions"');
    await queryRunner.query('DROP TABLE IF EXISTS "permissions"');
    await queryRunner.query('DROP TABLE IF EXISTS "user_sessions"');
    await queryRunner.query('DROP TABLE IF EXISTS "external_identities"');
    await queryRunner.query('DROP TABLE IF EXISTS "users"');
    await queryRunner.query('DROP TYPE IF EXISTS "user_status"');
    await queryRunner.query('DROP TYPE IF EXISTS "app_role"');
  }
}
