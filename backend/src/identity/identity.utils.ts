import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { InvitationRecipientType } from './entities/identity-invitation.entity';
import { VerifiedIdentity } from './identity-token-verifier';

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function tokenHashMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeInvitationRecipient(type: InvitationRecipientType, value: string): string {
  const normalized = value.trim().toLowerCase();

  if (type === InvitationRecipientType.PHONE) {
    return normalized.replace(/[\s()-]/g, '');
  }

  return normalized;
}

export function identityMatchesInvitation(
  identity: VerifiedIdentity,
  type: InvitationRecipientType,
  normalizedRecipient: string,
): boolean {
  if (type === InvitationRecipientType.EMAIL) {
    return identity.emailVerified && identity.email?.trim().toLowerCase() === normalizedRecipient;
  }

  return (
    identity.phone !== null &&
    normalizeInvitationRecipient(type, identity.phone) === normalizedRecipient
  );
}
