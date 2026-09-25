import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { Environment } from '../config/environment';
import { UserRole, UserStatus } from './access-control';
import { AuthContext } from './auth-context';
import { ExternalIdentityEntity } from './entities/external-identity.entity';
import { IdentityInvitationEntity, InvitationStatus } from './entities/identity-invitation.entity';
import { SecurityAuditEventEntity } from './entities/security-audit-event.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { UserEntity } from './entities/user.entity';
import {
  IDENTITY_TOKEN_VERIFIER,
  IdentityTokenVerifier,
  VerifiedIdentity,
} from './identity-token-verifier';
import { createOpaqueToken, hashToken, identityMatchesInvitation } from './identity.utils';

export interface PublicUserView {
  id: string;
  role: UserRole;
  status: UserStatus;
  displayName: string | null;
  email: string | null;
  phone: string | null;
}

export interface SessionExchangeResult {
  user: PublicUserView;
  sessionToken: string;
  csrfToken: string;
  expiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(IDENTITY_TOKEN_VERIFIER)
    private readonly identityVerifier: IdentityTokenVerifier,
    private readonly dataSource: DataSource,
    @InjectRepository(UserSessionEntity)
    private readonly sessions: Repository<UserSessionEntity>,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async createSession(idToken: string, invitationToken?: string): Promise<SessionExchangeResult> {
    let identity: VerifiedIdentity;
    try {
      identity = await this.identityVerifier.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Identity verification failed. Please sign in again.');
    }

    const now = new Date();
    const user = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
        `${identity.provider}:${identity.subject}`,
      ]);
      return this.linkIdentity(manager, identity, invitationToken, now);
    });

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account is not active.');
    }

    const sessionToken = createOpaqueToken();
    const csrfToken = createOpaqueToken();
    const ttlSeconds = this.config.get('AUTH_SESSION_TTL_SECONDS', { infer: true });
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1_000);
    const authenticatedAt = identity.authenticatedAt > now ? now : identity.authenticatedAt;

    await this.sessions.insert({
      id: randomUUID(),
      tokenHash: hashToken(sessionToken),
      csrfTokenHash: hashToken(csrfToken),
      userId: user.id,
      providerSubject: identity.subject,
      expiresAt,
      reauthenticatedAt: authenticatedAt,
      mfaVerifiedAt: identity.mfaVerified ? authenticatedAt : null,
      createdAt: now,
      lastSeenAt: now,
      revokedAt: null,
    });

    return { user: toPublicUser(user), sessionToken, csrfToken, expiresAt };
  }

  async reauthenticate(auth: AuthContext, idToken: string): Promise<void> {
    let identity: VerifiedIdentity;
    try {
      identity = await this.identityVerifier.verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Identity verification failed. Please sign in again.');
    }

    if (identity.subject !== auth.session.providerSubject) {
      throw new ForbiddenException('The reauthentication identity does not match this session.');
    }

    const now = new Date();
    const authenticatedAt = identity.authenticatedAt > now ? now : identity.authenticatedAt;
    await this.sessions.update(
      { id: auth.session.id, revokedAt: IsNull() },
      {
        reauthenticatedAt: authenticatedAt,
        mfaVerifiedAt: identity.mfaVerified ? authenticatedAt : null,
      },
    );
  }

  private async linkIdentity(
    manager: EntityManager,
    identity: VerifiedIdentity,
    invitationToken: string | undefined,
    now: Date,
  ): Promise<UserEntity> {
    const identities = manager.getRepository(ExternalIdentityEntity);
    const users = manager.getRepository(UserEntity);
    let externalIdentity = await identities.findOne({
      where: { provider: identity.provider, providerSubject: identity.subject },
      relations: { user: true },
    });
    let user = externalIdentity?.user;
    const invitation = invitationToken
      ? await this.resolveInvitation(manager, invitationToken, identity, now)
      : null;

    if (!user) {
      const role = invitation?.role ?? UserRole.VISITOR;
      this.assertMfaForPrivilegedRole(identity, role);
      user = users.create({
        id: randomUUID(),
        role,
        status: UserStatus.ACTIVE,
        displayName: identity.displayName,
        email: identity.emailVerified ? identity.email : null,
        phone: identity.phone,
        createdAt: now,
        updatedAt: now,
        lastSignedInAt: now,
      });
      await users.insert(user);

      externalIdentity = identities.create({
        id: randomUUID(),
        provider: identity.provider,
        providerSubject: identity.subject,
        signInProvider: identity.signInProvider,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      });
      await identities.insert(externalIdentity);
      await this.recordAudit(manager, null, 'identity.user-created', 'user', user.id, {
        role: user.role,
      });
      await this.recordAudit(manager, user.id, 'identity.external-linked', 'user', user.id, {
        provider: identity.provider,
        signInProvider: identity.signInProvider,
      });
    } else {
      if (user.status !== UserStatus.ACTIVE) {
        return user;
      }

      if (invitation) {
        const currentRank = roleRank(user.role);
        const invitedRank = roleRank(invitation.role);
        if (invitedRank <= currentRank) {
          throw new ForbiddenException('This invitation cannot change the current account role.');
        }
        this.assertMfaForPrivilegedRole(identity, invitation.role);
        const previousRole = user.role;
        user.role = invitation.role;
        await this.recordAudit(
          manager,
          user.id,
          'identity.role-changed-by-invitation',
          'user',
          user.id,
          {
            from: previousRole,
            to: user.role,
            invitationId: invitation.id,
          },
        );
      }

      user.displayName = identity.displayName ?? user.displayName;
      user.email = identity.emailVerified ? identity.email : user.email;
      user.phone = identity.phone ?? user.phone;
      user.lastSignedInAt = now;
      user.updatedAt = now;
      await users.save(user);
      await identities.update(
        { id: externalIdentity!.id },
        { signInProvider: identity.signInProvider, updatedAt: now },
      );
    }

    if (invitation) {
      invitation.status = InvitationStatus.ACCEPTED;
      invitation.acceptedByUserId = user.id;
      invitation.acceptedAt = now;
      await manager.getRepository(IdentityInvitationEntity).save(invitation);
      await this.recordAudit(
        manager,
        user.id,
        'identity.invitation-accepted',
        'invitation',
        invitation.id,
        {
          role: invitation.role,
        },
      );
    }

    return user;
  }

  private async resolveInvitation(
    manager: EntityManager,
    rawToken: string,
    identity: VerifiedIdentity,
    now: Date,
  ): Promise<IdentityInvitationEntity> {
    const invitation = await manager.getRepository(IdentityInvitationEntity).findOne({
      where: { tokenHash: hashToken(rawToken) },
      lock: { mode: 'pessimistic_write' },
    });

    if (!invitation || invitation.status !== InvitationStatus.PENDING) {
      throw new ForbiddenException('The invitation is invalid or no longer available.');
    }

    if (invitation.expiresAt <= now) {
      invitation.status = InvitationStatus.EXPIRED;
      await manager.getRepository(IdentityInvitationEntity).save(invitation);
      throw new ForbiddenException('The invitation is invalid or no longer available.');
    }

    if (
      !identityMatchesInvitation(identity, invitation.recipientType, invitation.recipientNormalized)
    ) {
      throw new ForbiddenException(
        'The signed-in identity does not match the invitation recipient.',
      );
    }

    return invitation;
  }

  private assertMfaForPrivilegedRole(identity: VerifiedIdentity, role: UserRole): void {
    const required = this.config.get('AUTH_PRIVILEGED_MFA_REQUIRED', { infer: true });
    if (required && role !== UserRole.VISITOR && !identity.mfaVerified) {
      throw new ForbiddenException(
        'Multi-factor verification is required for privileged accounts.',
      );
    }
  }

  private async recordAudit(
    manager: EntityManager,
    actorUserId: string | null,
    action: string,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const repository = manager.getRepository(SecurityAuditEventEntity);
    await repository.save(
      repository.create({
        actorUserId,
        action,
        targetType,
        targetId,
        metadata,
        createdAt: new Date(),
      }),
    );
  }
}

export function toPublicUser(user: UserEntity): PublicUserView {
  return {
    id: user.id,
    role: user.role,
    status: user.status,
    displayName: user.displayName,
    email: user.email,
    phone: user.phone,
  };
}

function roleRank(role: UserRole): number {
  return { [UserRole.VISITOR]: 0, [UserRole.TEACHER]: 1, [UserRole.ADMIN]: 2 }[role];
}
