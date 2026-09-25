import { randomUUID } from 'node:crypto';
import { appDataSource } from '../database/data-source';
import { validateEnvironment } from '../config/environment';
import { UserRole, UserStatus } from './access-control';
import {
  IdentityInvitationEntity,
  InvitationRecipientType,
  InvitationStatus,
} from './entities/identity-invitation.entity';
import { SecurityAuditEventEntity } from './entities/security-audit-event.entity';
import { UserEntity } from './entities/user.entity';
import { createOpaqueToken, hashToken, normalizeInvitationRecipient } from './identity.utils';

async function createInitialAdminInvitation(): Promise<void> {
  const environment = validateEnvironment(process.env);
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const phone = process.env.INITIAL_ADMIN_PHONE?.trim();
  if ((email ? 1 : 0) + (phone ? 1 : 0) !== 1) {
    throw new Error('Set exactly one of INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PHONE.');
  }

  const recipientType = email ? InvitationRecipientType.EMAIL : InvitationRecipientType.PHONE;
  const recipient = email ?? phone!;
  const recipientNormalized = normalizeInvitationRecipient(recipientType, recipient);
  if (
    recipientType === InvitationRecipientType.EMAIL &&
    !/^\S+@\S+\.\S+$/.test(recipientNormalized)
  ) {
    throw new Error('INITIAL_ADMIN_EMAIL is not a valid email address.');
  }
  if (
    recipientType === InvitationRecipientType.PHONE &&
    !/^\+[1-9]\d{7,14}$/.test(recipientNormalized)
  ) {
    throw new Error('INITIAL_ADMIN_PHONE must use E.164 format, for example +9647XXXXXXXXX.');
  }

  await appDataSource.initialize();
  const token = createOpaqueToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + environment.AUTH_INVITATION_TTL_HOURS * 60 * 60 * 1_000,
  );

  try {
    await appDataSource.transaction(async (manager) => {
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended('geo-kurdistan.initial-admin', 0))",
      );
      const activeAdmins = await manager.getRepository(UserEntity).count({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      });
      if (activeAdmins > 0) {
        throw new Error(
          'An active administrator already exists; use the protected admin workflow.',
        );
      }

      await manager
        .createQueryBuilder()
        .update(IdentityInvitationEntity)
        .set({ status: InvitationStatus.REVOKED, revokedAt: now })
        .where('role = :role', { role: UserRole.ADMIN })
        .andWhere('created_by_user_id IS NULL')
        .andWhere('status = :status', { status: InvitationStatus.PENDING })
        .execute();

      const invitations = manager.getRepository(IdentityInvitationEntity);
      const invitation = invitations.create({
        id: randomUUID(),
        tokenHash: hashToken(token),
        role: UserRole.ADMIN,
        recipientType,
        recipientNormalized,
        status: InvitationStatus.PENDING,
        createdByUserId: null,
        acceptedByUserId: null,
        createdAt: now,
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
      });
      await invitations.insert(invitation);

      const audits = manager.getRepository(SecurityAuditEventEntity);
      await audits.save(
        audits.create({
          actorUserId: null,
          action: 'identity.initial-admin-invitation-created',
          targetType: 'invitation',
          targetId: invitation.id,
          metadata: { recipientType },
          createdAt: now,
        }),
      );
    });

    process.stdout.write(
      [
        'Initial admin invitation created.',
        `Recipient: ${recipientNormalized}`,
        `Expires: ${expiresAt.toISOString()}`,
        `Invitation token (shown once): ${token}`,
      ].join('\n') + '\n',
    );
  } finally {
    await appDataSource.destroy();
  }
}

void createInitialAdminInvitation().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown initial-admin setup failure';
  process.stderr.write(`Initial admin invitation failed: ${message}\n`);
  process.exitCode = 1;
});
