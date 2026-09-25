import { QueryRunner } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';
import { IdentityAndAccess1790355000000 } from './1790355000000-identity-and-access';

describe('identity and access migration', () => {
  it('creates fixed-role identity, revocable-session, invitation, permission, and audit storage', async () => {
    const query = vi.fn().mockResolvedValue(undefined);
    const runner = { query } as unknown as QueryRunner;

    await new IdentityAndAccess1790355000000().up(runner);

    const sql = query.mock.calls.map((call) => String(call[0])).join('\n');
    expect(sql).toContain(`CREATE TYPE "app_role" AS ENUM ('visitor', 'teacher', 'admin')`);
    expect(sql).toContain('CREATE TABLE "users"');
    expect(sql).toContain('CREATE TABLE "external_identities"');
    expect(sql).toContain('CREATE TABLE "user_sessions"');
    expect(sql).toContain('CREATE TABLE "role_permissions"');
    expect(sql).toContain('CREATE TABLE "identity_invitations"');
    expect(sql).toContain('CREATE TABLE "security_audit_events"');
    expect(sql).toContain('ck_identity_invitations_privileged_role');
  });
});
