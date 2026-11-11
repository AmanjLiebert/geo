export const IDENTITY_TOKEN_VERIFIER = Symbol('IDENTITY_TOKEN_VERIFIER');

export interface VerifiedIdentity {
  provider: 'firebase';
  subject: string;
  signInProvider: string | null;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  displayName: string | null;
  authenticatedAt: Date;
  mfaVerified: boolean;
}

export interface IdentityTokenVerifier {
  verifyIdToken(idToken: string): Promise<VerifiedIdentity>;
}
