import { describe, expect, it } from 'vitest';
import { InvitationRecipientType } from './entities/identity-invitation.entity';
import { VerifiedIdentity } from './identity-token-verifier';
import {
  createOpaqueToken,
  hashToken,
  identityMatchesInvitation,
  normalizeInvitationRecipient,
  tokenHashMatches,
} from './identity.utils';

const identity: VerifiedIdentity = {
  provider: 'firebase',
  subject: 'firebase-user',
  signInProvider: 'google.com',
  email: 'Teacher@Example.com',
  emailVerified: true,
  phone: '+9647501234567',
  displayName: 'Teacher',
  authenticatedAt: new Date(),
  mfaVerified: false,
};

describe('identity security utilities', () => {
  it('creates random opaque tokens and verifies only matching hashes', () => {
    const token = createOpaqueToken();
    expect(token).toHaveLength(43);
    expect(tokenHashMatches(token, hashToken(token))).toBe(true);
    expect(tokenHashMatches(`${token}x`, hashToken(token))).toBe(false);
  });

  it('normalizes invitation recipients', () => {
    expect(
      normalizeInvitationRecipient(InvitationRecipientType.EMAIL, ' Teacher@Example.COM '),
    ).toBe('teacher@example.com');
    expect(normalizeInvitationRecipient(InvitationRecipientType.PHONE, '+964 (750) 123-4567')).toBe(
      '+9647501234567',
    );
  });

  it('requires a verified email or the matching verified phone identity', () => {
    expect(
      identityMatchesInvitation(identity, InvitationRecipientType.EMAIL, 'teacher@example.com'),
    ).toBe(true);
    expect(
      identityMatchesInvitation(
        { ...identity, emailVerified: false },
        InvitationRecipientType.EMAIL,
        'teacher@example.com',
      ),
    ).toBe(false);
    expect(
      identityMatchesInvitation(identity, InvitationRecipientType.PHONE, '+9647501234567'),
    ).toBe(true);
  });
});
