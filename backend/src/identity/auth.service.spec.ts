import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { UserRole, UserStatus } from './access-control';
import { AuthService } from './auth.service';
import { ExternalIdentityEntity } from './entities/external-identity.entity';
import {
  IdentityInvitationEntity,
  InvitationRecipientType,
  InvitationStatus,
} from './entities/identity-invitation.entity';
import { SecurityAuditEventEntity } from './entities/security-audit-event.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { UserEntity } from './entities/user.entity';
import { hashToken } from './identity.utils';
import { IdentityTokenVerifier, VerifiedIdentity } from './identity-token-verifier';

describe('AuthService', () => {
  const now = new Date('2026-09-26T16:40:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  it('revokes every older session when an invitation promotes an existing user', async () => {
    const identity: VerifiedIdentity = {
      provider: 'firebase',
      subject: 'firebase-visitor',
      signInProvider: 'google.com',
      email: 'visitor@example.org',
      emailVerified: true,
      phone: null,
      displayName: 'Visitor',
      authenticatedAt: now,
      mfaVerified: false,
    };
    const user = {
      id: '3a8c9d80-7b72-4ce0-b76e-08b45af2f203',
      role: UserRole.VISITOR,
      status: UserStatus.ACTIVE,
      displayName: 'Visitor',
      email: 'visitor@example.org',
      phone: null,
      createdAt: now,
      updatedAt: now,
      lastSignedInAt: now,
    } as UserEntity;
    const externalIdentity = {
      id: '3fa7fbbc-7a64-4f89-8e53-1cdff7583ab0',
      provider: 'firebase',
      providerSubject: identity.subject,
      signInProvider: identity.signInProvider,
      userId: user.id,
      user,
      createdAt: now,
      updatedAt: now,
    };
    const invitation = {
      id: 'a210ea96-07cf-47a5-bfa3-09ca42b54687',
      tokenHash: hashToken('valid-invitation-token'),
      role: UserRole.TEACHER,
      recipientType: InvitationRecipientType.EMAIL,
      recipientNormalized: 'visitor@example.org',
      status: InvitationStatus.PENDING,
      createdByUserId: null,
      acceptedByUserId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      acceptedAt: null,
      revokedAt: null,
    } as IdentityInvitationEntity;

    const queryBuilder = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected: 2 }),
    };
    const identities = {
      findOne: vi.fn().mockResolvedValue(externalIdentity),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    const users = {
      save: vi.fn().mockResolvedValue(user),
    };
    const invitations = {
      findOne: vi.fn().mockResolvedValue(invitation),
      save: vi.fn().mockResolvedValue(invitation),
    };
    const audit = {
      create: vi.fn().mockImplementation((value: unknown) => value),
      save: vi.fn().mockResolvedValue(undefined),
    };
    const manager = {
      query: vi.fn().mockResolvedValue(undefined),
      createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
      getRepository: vi.fn().mockImplementation((entity: unknown) => {
        if (entity === ExternalIdentityEntity) return identities;
        if (entity === UserEntity) return users;
        if (entity === IdentityInvitationEntity) return invitations;
        if (entity === SecurityAuditEventEntity) return audit;
        throw new Error('Unexpected repository requested');
      }),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: vi
        .fn()
        .mockImplementation((work: (value: EntityManager) => unknown) =>
          Promise.resolve(work(manager)),
        ),
    } as unknown as DataSource;
    const insertSession = vi.fn().mockResolvedValue({ identifiers: [] });
    const sessions = {
      insert: insertSession,
    } as unknown as Repository<UserSessionEntity>;
    const config = {
      get: vi.fn().mockImplementation((key: keyof Environment) => {
        if (key === 'AUTH_SESSION_TTL_SECONDS') return 3600;
        if (key === 'AUTH_PRIVILEGED_MFA_REQUIRED') return false;
        throw new Error(`Unexpected configuration key: ${key}`);
      }),
    } as unknown as ConfigService<Environment, true>;
    const verifier = {
      verifyIdToken: vi.fn().mockResolvedValue(identity),
    } satisfies IdentityTokenVerifier;
    const service = new AuthService(verifier, dataSource, sessions, config);

    const result = await service.createSession('valid-firebase-id-token', 'valid-invitation-token');

    expect(result.user.role).toBe(UserRole.TEACHER);
    expect(queryBuilder.update).toHaveBeenCalledWith(UserSessionEntity);
    expect(queryBuilder.set).toHaveBeenCalledWith({ revokedAt: now });
    expect(queryBuilder.where).toHaveBeenCalledWith('user_id = :userId', { userId: user.id });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('revoked_at IS NULL');
    expect(queryBuilder.execute).toHaveBeenCalledOnce();
    expect(insertSession).toHaveBeenCalledOnce();
    expect(invitation.status).toBe(InvitationStatus.ACCEPTED);
    expect(invitation.acceptedByUserId).toBe(user.id);
  });
});
