import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Header,
  Headers,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RouteConfig } from '@nestjs/platform-fastify';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Environment } from '../config/environment';
import { Permission } from './access-control';
import { CurrentAuth, Public, RequirePermissions } from './access.decorators';
import { AuthContext } from './auth-context';
import { AuthService, toPublicUser } from './auth.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { ReauthenticateDto } from './dto/reauthenticate.dto';
import { createOpaqueToken, hashToken, tokenHashMatches } from './identity.utils';
import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Public()
  @Get('csrf')
  getPreauthCsrf(@Res({ passthrough: true }) reply: FastifyReply): { csrfToken: string } {
    const csrfToken = createOpaqueToken();
    reply.header('Cache-Control', 'no-store');
    reply.setCookie(this.config.get('AUTH_PREAUTH_CSRF_COOKIE_NAME', { infer: true }), csrfToken, {
      ...this.cookieOptions(false),
      maxAge: 10 * 60,
    });
    return { csrfToken };
  }

  @Public()
  @Post('session')
  @RouteConfig({ rateLimit: { max: 10, timeWindow: 60_000 } })
  async createSession(
    @Body() input: CreateSessionDto,
    @Headers('x-csrf-token') csrfHeader: string | undefined,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const preauthCookieName = this.config.get('AUTH_PREAUTH_CSRF_COOKIE_NAME', { infer: true });
    const csrfCookie = request.cookies[preauthCookieName];
    if (!csrfHeader || !csrfCookie || !tokenHashMatches(csrfHeader, hashToken(csrfCookie))) {
      throw new ForbiddenException('The sign-in security token is missing or invalid.');
    }

    const result = await this.authService.createSession(input.idToken, input.invitationToken);
    const maxAge = Math.max(0, Math.floor((result.expiresAt.getTime() - Date.now()) / 1_000));
    reply.header('Cache-Control', 'no-store');
    reply.setCookie(
      this.config.get('AUTH_SESSION_COOKIE_NAME', { infer: true }),
      result.sessionToken,
      {
        ...this.cookieOptions(true),
        maxAge,
      },
    );
    reply.setCookie(this.config.get('AUTH_CSRF_COOKIE_NAME', { infer: true }), result.csrfToken, {
      ...this.cookieOptions(false),
      maxAge,
    });
    reply.clearCookie(preauthCookieName, this.cookieOptions(false));
    return {
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
      csrfToken: result.csrfToken,
    };
  }

  @Get('me')
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(Permission.VIEW_OWN_ACCOUNT)
  getCurrentUser(@CurrentAuth() auth: AuthContext) {
    return { user: toPublicUser(auth.user), expiresAt: auth.session.expiresAt.toISOString() };
  }

  @Post('reauthenticate')
  @RequirePermissions(Permission.VIEW_OWN_ACCOUNT)
  @RouteConfig({ rateLimit: { max: 10, timeWindow: 60_000 } })
  async reauthenticate(@CurrentAuth() auth: AuthContext, @Body() input: ReauthenticateDto) {
    await this.authService.reauthenticate(auth, input.idToken);
    return { reauthenticated: true };
  }

  @Delete('session')
  @RequirePermissions(Permission.VIEW_OWN_ACCOUNT)
  async deleteSession(
    @CurrentAuth() auth: AuthContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ signedOut: true }> {
    await this.sessions.revoke(auth.session.id);
    reply.header('Cache-Control', 'no-store');
    reply.clearCookie(
      this.config.get('AUTH_SESSION_COOKIE_NAME', { infer: true }),
      this.cookieOptions(true),
    );
    reply.clearCookie(
      this.config.get('AUTH_CSRF_COOKIE_NAME', { infer: true }),
      this.cookieOptions(false),
    );
    return { signedOut: true };
  }

  private cookieOptions(httpOnly: boolean) {
    const domain = this.config.get('AUTH_COOKIE_DOMAIN', { infer: true });
    return {
      httpOnly,
      secure: this.config.get('AUTH_COOKIE_SECURE', { infer: true }),
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }
}
