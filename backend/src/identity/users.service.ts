import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { Environment } from '../config/environment';
import { UserRole, UserStatus } from './access-control';
import {
  IdentityInvitationEntity,
  InvitationRecipientType,
  InvitationStatus,
} from './entities/identity-invitation.entity';
import { SecurityAuditEventEntity } from './entities/security-audit-event.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { UserEntity } from './entities/user.entity';
import { createOpaqueToken, hashToken, normalizeInvitationRecipient } from './identity.utils';

export interface CreateInvitationInput {
  recipientType: InvitationRecipientType;
  recipient: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async listUsers(limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const [users, total] = await this.dataSource.getRepository(UserEntity).findAndCount({
      order: { createdAt: 'DESC' },
      take: safeLimit,
      skip: safeOffset,
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        role: user.role,
        status: user.status,
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        lastSignedInAt: user.lastSignedInAt?.toISOString() ?? null,
      })),
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async listInvitations(limit = 50, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);
    const [invitations, total] = await this.dataSource
      .getRepository(IdentityInvitationEntity)
      .findAndCount({ order: { createdAt: 'DESC' }, take: safeLimit, skip: safeOffset });
    return {
      items: invitations.map((invitation) => ({
        id: invitation.id,
        role: invitation.role,
        recipientType: invitation.recipientType,
        recipient: invitation.recipientNormalized,
        status: invitation.status,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
      })),
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  }

  async createInvitation(actorUserId: string | null, input: CreateInvitationInput) {
    if (input.role === UserRole.VISITOR) {
      throw new BadRequestException('Public registration already creates visitor accounts.');
    }

    const recipientNormalized = normalizeInvitationRecipient(input.recipientType, input.recipient);
    if (
      (input.recipientType === InvitationRecipientType.EMAIL &&
        !/^\S+@\S+\.\S+$/.test(recipientNormalized)) ||
      (input.recipientType === InvitationRecipientType.PHONE &&
        !/^\+[1-9]\d{7,14}$/.test(recipientNormalized))
    ) {
      throw new BadRequestException(
        'Invitation recipient is not a valid email address or E.164 phone number.',
      );
    }
    const rawToken = createOpaqueToken();
    const now = new Date();
    const ttlHours = this.config.get('AUTH_INVITATION_TTL_HOURS', { infer: true });
    const invitation = this.dataSource.getRepository(IdentityInvitationEntity).create({
      id: randomUUID(),
      tokenHash: hashToken(rawToken),
      role: input.role,
      recipientType: input.recipientType,
      recipientNormalized,
      status: InvitationStatus.PENDING,
      createdByUserId: actorUserId,
      acceptedByUserId: null,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlHours * 60 * 60 * 1_000),
      acceptedAt: null,
      revokedAt: null,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(IdentityInvitationEntity)
        .set({ status: InvitationStatus.REVOKED, revokedAt: now })
        .where('recipient_type = :recipientType', { recipientType: input.recipientType })
        .andWhere('recipient_normalized = :recipientNormalized', { recipientNormalized })
        .andWhere('role = :role', { role: input.role })
        .andWhere('status = :status', { status: InvitationStatus.PENDING })
        .execute();
      await manager.getRepository(IdentityInvitationEntity).insert(invitation);
      await this.recordAudit(
        manager,
        actorUserId,
        'identity.invitation-created',
        'invitation',
        invitation.id,
        {
          role: invitation.role,
          recipientType: invitation.recipientType,
        },
      );
    });

    return {
      id: invitation.id,
      role: invitation.role,
      recipientType: invitation.recipientType,
      recipient: invitation.recipientNormalized,
      expiresAt: invitation.expiresAt.toISOString(),
      token: rawToken,
    };
  }

  async revokeInvitation(actorUserId: string, invitationId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const invitation = await manager.getRepository(IdentityInvitationEntity).findOne({
        where: { id: invitationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invitation) throw new NotFoundException('Invitation not found.');
      if (invitation.status !== InvitationStatus.PENDING) {
        throw new ConflictException('Only a pending invitation can be revoked.');
      }
      invitation.status = InvitationStatus.REVOKED;
      invitation.revokedAt = new Date();
      await manager.getRepository(IdentityInvitationEntity).save(invitation);
      await this.recordAudit(
        manager,
        actorUserId,
        'identity.invitation-revoked',
        'invitation',
        invitation.id,
        {
          role: invitation.role,
        },
      );
    });
  }

  async updateRole(actorUserId: string, targetUserId: string, role: UserRole): Promise<void> {
    if (actorUserId === targetUserId) {
      throw new BadRequestException('Use another administrator to change your own role.');
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await this.lockUser(manager, targetUserId);
      if (user.role === role) return;
      if (user.role === UserRole.ADMIN) await this.assertAnotherActiveAdmin(manager, user.id);
      const previousRole = user.role;
      user.role = role;
      user.updatedAt = new Date();
      await manager.getRepository(UserEntity).save(user);
      await this.revokeSessions(manager, user.id);
      await this.recordAudit(manager, actorUserId, 'identity.role-changed', 'user', user.id, {
        from: previousRole,
        to: role,
      });
    });
  }

  async updateStatus(actorUserId: string, targetUserId: string, status: UserStatus): Promise<void> {
    if (actorUserId === targetUserId) {
      throw new BadRequestException('Use another administrator to change your own account status.');
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await this.lockUser(manager, targetUserId);
      if (user.status === status) return;
      if (user.role === UserRole.ADMIN && status === UserStatus.DISABLED) {
        await this.assertAnotherActiveAdmin(manager, user.id);
      }
      const previousStatus = user.status;
      user.status = status;
      user.updatedAt = new Date();
      await manager.getRepository(UserEntity).save(user);
      if (status === UserStatus.DISABLED) await this.revokeSessions(manager, user.id);
      await this.recordAudit(manager, actorUserId, 'identity.status-changed', 'user', user.id, {
        from: previousStatus,
        to: status,
      });
    });
  }

  private async lockUser(manager: EntityManager, userId: string): Promise<UserEntity> {
    const user = await manager.getRepository(UserEntity).findOne({
      where: { id: userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  private async assertAnotherActiveAdmin(
    manager: EntityManager,
    excludingUserId: string,
  ): Promise<void> {
    const otherAdmins = await manager
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.ADMIN })
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('user.id <> :excludingUserId', { excludingUserId })
      .getCount();
    if (otherAdmins === 0) {
      throw new ConflictException('The last active administrator cannot be removed or disabled.');
    }
  }

  private async revokeSessions(manager: EntityManager, userId: string): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ revokedAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
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
