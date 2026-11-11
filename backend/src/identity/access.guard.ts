import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { Environment } from '../config/environment';
import { hasPermission, Permission } from './access-control';
import {
  HIGH_RISK_ACTION_KEY,
  PUBLIC_ENDPOINT_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from './access.decorators';
import { SecurityAuditService } from './security-audit.service';
import { SessionService } from './session.service';
import { tokenHashMatches } from './identity.utils';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
    private readonly audit: SecurityAuditService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ENDPOINT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const cookieName = this.config.get('AUTH_SESSION_COOKIE_NAME', { infer: true });
    const auth = await this.sessions.authenticate(request.cookies[cookieName]);
    request.auth = auth;

    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (
      !required?.length ||
      !required.every((permission) => hasPermission(auth.user.role, permission))
    ) {
      await this.audit.record({
        actorUserId: auth.user.id,
        action: 'authorization.denied',
        targetType: 'route',
        metadata: { method: request.method, route: request.routeOptions.url },
      });
      throw new ForbiddenException('You do not have permission to perform this action.');
    }

    if (this.isUnsafeMethod(request.method)) {
      try {
        this.assertCsrf(request, auth.session.csrfTokenHash);
      } catch (error) {
        await this.audit.record({
          actorUserId: auth.user.id,
          action: 'authorization.csrf-denied',
          targetType: 'route',
          metadata: { method: request.method, route: request.routeOptions.url },
        });
        throw error;
      }
    }

    const highRisk = this.reflector.getAllAndOverride<boolean>(HIGH_RISK_ACTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (highRisk) {
      await this.assertRecentPrivilegedAuthentication(auth, request);
    }

    return true;
  }

  private assertCsrf(request: FastifyRequest, expectedHash: string): void {
    const csrfCookieName = this.config.get('AUTH_CSRF_COOKIE_NAME', { infer: true });
    const header = request.headers['x-csrf-token'];
    const headerValue = Array.isArray(header) ? header[0] : header;
    const cookieValue = request.cookies[csrfCookieName];

    if (
      !headerValue ||
      !cookieValue ||
      headerValue !== cookieValue ||
      !tokenHashMatches(headerValue, expectedHash)
    ) {
      throw new ForbiddenException(
        'The security token is missing or invalid. Refresh the page and try again.',
      );
    }
  }

  private async assertRecentPrivilegedAuthentication(
    auth: NonNullable<FastifyRequest['auth']>,
    request: FastifyRequest,
  ): Promise<void> {
    const maxAgeSeconds = this.config.get('AUTH_REAUTH_MAX_AGE_SECONDS', { infer: true });
    const reauthenticationAge = Date.now() - auth.session.reauthenticatedAt.getTime();
    const mfaRequired = this.config.get('AUTH_PRIVILEGED_MFA_REQUIRED', { infer: true });
    const recent = reauthenticationAge >= 0 && reauthenticationAge <= maxAgeSeconds * 1_000;
    const mfaSatisfied = !mfaRequired || auth.session.mfaVerifiedAt !== null;

    if (!recent || !mfaSatisfied) {
      await this.audit.record({
        actorUserId: auth.user.id,
        action: 'authorization.reauthentication-required',
        targetType: 'route',
        metadata: { method: request.method, route: request.routeOptions.url, mfaRequired },
      });
      throw new ForbiddenException({
        message: 'Recent authentication is required for this protected action.',
        code: 'reauthentication_required',
      });
    }
  }

  private isUnsafeMethod(method: string): boolean {
    return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
  }
}
