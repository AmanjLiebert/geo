import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { UserRole } from '../access-control';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

export enum InvitationRecipientType {
  EMAIL = 'email',
  PHONE = 'phone',
}

@Entity({ name: 'identity_invitations' })
export class IdentityInvitationEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Index('uq_identity_invitations_token_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ type: 'enum', enum: UserRole, enumName: 'app_role' })
  role!: UserRole;

  @Column({ name: 'recipient_type', type: 'varchar', length: 16 })
  recipientType!: InvitationRecipientType;

  @Column({ name: 'recipient_normalized', type: 'varchar', length: 320 })
  recipientNormalized!: string;

  @Column({ type: 'varchar', length: 20 })
  status!: InvitationStatus;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId!: string | null;

  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  acceptedByUserId!: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;
}
