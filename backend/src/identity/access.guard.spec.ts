import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { Permission, UserRole, UserStatus } from './access-control';
import {
  HIGH_RISK_ACTION_KEY,
  PUBLIC_ENDPOINT_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './access.decorators';
import { AccessGuard } from './access.guard';
import { AuthContext } from './auth-context';
import { SecurityAuditService } from './security-audit.service';
import { SessionService } from './session.service';
import { hashToken } from './identity.utils';

function createHarness(input?: {
  role?: UserRole;
  permissions?: Permission[];
  method?: string;
  csrf?: string;
  highRisk?: boolean;
  reauthenticatedAt?: Date;
}) {
  const csrf = input?.csrf ?? 'csrf-token';
  const auth = {
    user: { id: 'user-1', role: input?.role ?? UserRole.VISITOR, status: UserStatus.ACTIVE },
    session: {
      id: 'session-1',
      csrfTokenHash: hashToken(csrf),
      reauthenticatedAt: input?.reauthenticatedAt ?? new Date(),
      mfaVerifiedAt: null,
    },
  } as AuthContext;
  const request = {
    method: input?.method ?? 'GET',
    cookies: { gk_session: 'session-token', gk_csrf: csrf },
    headers: { 'x-csrf-token': csrf },
    routeOptions: { url: '/test' },
  } as unknown as FastifyRequest;
  const context = {
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === PUBLIC_ENDPOINT_KEY) return false;
      if (key === REQUIRED_PERMISSIONS_KEY) return input?.permissions;
      if (key === HIGH_RISK_ACTION_KEY) return input?.highRisk ?? false;
      return undefined;
    }),
  } as unknown as Reflector;
  const authenticate = vi.fn().mockResolvedValue(auth);
  const sessions = { authenticate } as unknown as SessionService;
  const audit = { record: vi.fn().mockResolvedValue(undefined) } as unknown as SecurityAuditService;
  const values: Partial<Environment> = {
    AUTH_SESSION_COOKIE_NAME: 'gk_session',
    AUTH_CSRF_COOKIE_NAME: 'gk_csrf',
    AUTH_REAUTH_MAX_AGE_SECONDS: 300,
    AUTH_PRIVILEGED_MFA_REQUIRED: false,
  };
  const config = {
    get: vi.fn((key: keyof Environment) => values[key]),
  } as unknown as ConfigService<Environment, true>;

  return {
    guard: new AccessGuard(reflector, sessions, audit, config),
    context,
    request,
    audit,
    authenticate,
  };
}

describe('deny-by-default access guard', () => {
  it('denies a protected route when no valid session exists', async () => {
    const { guard, context, authenticate } = createHarness({
      permissions: [Permission.VIEW_OWN_ACCOUNT],
    });
    authenticate.mockRejectedValueOnce(new Error('invalid session'));
    await expect(guard.canActivate(context)).rejects.toThrow('invalid session');
  });

  it('denies authenticated routes that have no explicit permission policy', async () => {
    const { guard, context } = createHarness();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a visitor to read their own account', async () => {
    const { guard, context } = createHarness({ permissions: [Permission.VIEW_OWN_ACCOUNT] });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a visitor from admin account management', async () => {
    const { guard, context } = createHarness({ permissions: [Permission.MANAGE_USERS] });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires the session-bound CSRF value on unsafe requests', async () => {
    const { guard, context, request } = createHarness({
      permissions: [Permission.VIEW_OWN_ACCOUNT],
      method: 'DELETE',
    });
    request.headers['x-csrf-token'] = 'wrong-token';
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires recent authentication for high-risk actions', async () => {
    const { guard, context } = createHarness({
      role: UserRole.ADMIN,
      permissions: [Permission.MANAGE_USERS],
      method: 'PATCH',
      highRisk: true,
      reauthenticatedAt: new Date(Date.now() - 10 * 60 * 1_000),
    });
    try {
      await guard.canActivate(context);
      throw new Error('Expected high-risk action to require recent authentication.');
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        code: 'reauthentication_required',
      });
    }
  });
});
