import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { readFile } from 'node:fs/promises';
import { Environment } from '../config/environment';
import { resolveRootPath } from '../config/environment-file';
import { IdentityTokenVerifier, VerifiedIdentity } from './identity-token-verifier';

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

@Injectable()
export class FirebaseIdentityTokenVerifier implements IdentityTokenVerifier, OnModuleInit {
  private auth: Auth | undefined;

  constructor(private readonly config: ConfigService<Environment, true>) {}

  async onModuleInit(): Promise<void> {
    const appName = 'geo-kurdistan-auth';
    let app = getApps().find((candidate) => candidate.name === appName);

    if (!app) {
      app = await this.createApp(appName);
    }

    this.auth = getAuth(app);
  }

  async verifyIdToken(idToken: string): Promise<VerifiedIdentity> {
    if (!this.auth) {
      throw new Error('Firebase identity verifier has not initialized.');
    }

    const decoded = await this.auth.verifyIdToken(idToken, true);
    const firebaseClaims = decoded.firebase as Record<string, unknown> | undefined;
    const signInProvider =
      typeof firebaseClaims?.sign_in_provider === 'string' ? firebaseClaims.sign_in_provider : null;
    const secondFactor = firebaseClaims?.sign_in_second_factor;

    return {
      provider: 'firebase',
      subject: decoded.uid,
      signInProvider,
      email: typeof decoded.email === 'string' ? decoded.email : null,
      emailVerified: decoded.email_verified === true,
      phone: typeof decoded.phone_number === 'string' ? decoded.phone_number : null,
      displayName: typeof decoded.name === 'string' ? decoded.name : null,
      authenticatedAt: new Date(decoded.auth_time * 1_000),
      mfaVerified: typeof secondFactor === 'string' && secondFactor.length > 0,
    };
  }

  private async createApp(name: string): Promise<App> {
    const projectId = this.config.get('AUTH_FIREBASE_PROJECT_ID', { infer: true });
    const serviceAccountPath = this.config.get('AUTH_FIREBASE_SERVICE_ACCOUNT_PATH', {
      infer: true,
    });

    if (!serviceAccountPath) {
      return initializeApp({ credential: applicationDefault(), projectId }, name);
    }

    const raw = await readFile(resolveRootPath(serviceAccountPath), 'utf8');
    const serviceAccount = JSON.parse(raw) as FirebaseServiceAccount;
    return initializeApp(
      {
        credential: cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key,
        }),
        projectId,
      },
      name,
    );
  }
}
