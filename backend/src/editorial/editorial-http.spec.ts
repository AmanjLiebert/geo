import 'reflect-metadata';
import cookie from '@fastify/cookie';
import { UnauthorizedException, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { UserRole, UserStatus } from '../identity/access-control';
import { AccessGuard } from '../identity/access.guard';
import { AuthContext } from '../identity/auth-context';
import { SecurityAuditService } from '../identity/security-audit.service';
import { SessionService } from '../identity/session.service';
import { EditorialController } from './editorial.controller';
import { EditorialService } from './editorial.service';

describe('EditorialController HTTP requests and authorization', () => {
  let app: NestFastifyApplication;

  const mockEditorialService = {
    listNews: vi.fn(),
    listPages: vi.fn(),
  };

  const mockSecurityAuditService = {
    record: vi.fn().mockResolvedValue(undefined),
  };

  const mockSessionService = {
    authenticate: vi.fn((token: string | undefined): Promise<AuthContext> => {
      if (!token) {
        return Promise.reject(new UnauthorizedException('A valid session is required.'));
      }
      if (token === 'admin-session') {
        return Promise.resolve({
          user: { id: 'admin-1', role: UserRole.ADMIN, status: UserStatus.ACTIVE },
          session: {
            id: 'sess-admin',
            csrfTokenHash: 'hash',
            reauthenticatedAt: new Date(),
            mfaVerifiedAt: null,
          },
        } as AuthContext);
      }
      if (token === 'teacher-session') {
        return Promise.resolve({
          user: { id: 'teacher-1', role: UserRole.TEACHER, status: UserStatus.ACTIVE },
          session: {
            id: 'sess-teacher',
            csrfTokenHash: 'hash',
            reauthenticatedAt: new Date(),
            mfaVerifiedAt: null,
          },
        } as AuthContext);
      }
      if (token === 'visitor-session') {
        return Promise.resolve({
          user: { id: 'visitor-1', role: UserRole.VISITOR, status: UserStatus.ACTIVE },
          session: {
            id: 'sess-visitor',
            csrfTokenHash: 'hash',
            reauthenticatedAt: new Date(),
            mfaVerifiedAt: null,
          },
        } as AuthContext);
      }
      return Promise.reject(new UnauthorizedException('The session is invalid or has expired.'));
    }),
  };

  const configValues: Partial<Environment> = {
    AUTH_SESSION_COOKIE_NAME: 'gk_session',
    AUTH_CSRF_COOKIE_NAME: 'gk_csrf',
    AUTH_REAUTH_MAX_AGE_SECONDS: 300,
    AUTH_PRIVILEGED_MFA_REQUIRED: false,
  };

  const mockConfigService = {
    get: vi.fn((key: keyof Environment) => configValues[key]),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [EditorialController],
      providers: [
        { provide: EditorialService, useValue: mockEditorialService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: SecurityAuditService, useValue: mockSecurityAuditService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: APP_GUARD, useClass: AccessGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(cookie);
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditorialService.listNews.mockResolvedValue({
      items: [
        {
          id: 'news-1',
          title: 'Zagros Stratigraphy Update',
          slug: 'zagros-stratigraphy-update',
          status: 'published',
          publishedAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
    mockEditorialService.listPages.mockResolvedValue({
      items: [
        {
          id: 'page-1',
          pageType: 'about',
          title: 'About Geo-Kurdistan',
          status: 'published',
          effectiveAt: '2026-01-01T00:00:00.000Z',
          publishedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
    });
  });

  describe('GET /api/v1/editorial/news', () => {
    describe('HTTP authorization enforcement', () => {
      it('returns 401 Unauthorized when signed out (no session cookie)', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news',
        });
        expect(response.statusCode).toBe(401);
      });

      it('returns 403 Forbidden for signed-in visitor', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news',
          cookies: { gk_session: 'visitor-session' },
        });
        expect(response.statusCode).toBe(403);
      });

      it('returns 403 Forbidden for signed-in teacher', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news',
          cookies: { gk_session: 'teacher-session' },
        });
        expect(response.statusCode).toBe(403);
      });

      it('returns 200 OK for signed-in admin and returns news list', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('private, no-store');
        const body = JSON.parse(response.body) as {
          items: Array<{ id: string; title: string | null }>;
        };
        expect(body.items).toHaveLength(1);
        expect(body.items[0]!.id).toBe('news-1');
        expect(body.items[0]!.title).toBe('Zagros Stratigraphy Update');
        expect(mockEditorialService.listNews).toHaveBeenCalledWith(20, 0, undefined);
      });
    });

    describe('query validation at request boundary', () => {
      it('rejects an explicitly empty limit with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?limit=',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects malformed limit string (e.g. 20abc) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?limit=20abc',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects fractional limit (e.g. 1.5) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?limit=1.5',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects limit < 1 with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?limit=0',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects limit > 100 with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?limit=101',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects malformed offset string (e.g. 20abc) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?offset=20abc',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects fractional offset (e.g. 1.5) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?offset=1.5',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects negative offset with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?offset=-1',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects excessively large offset (> 100000) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?offset=100001',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects invalid status with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?status=deleted',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('passes valid parameters and applies defaults when omitted', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/news?limit=50&offset=100&status=draft',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(200);
        expect(mockEditorialService.listNews).toHaveBeenCalledWith(50, 100, 'draft');
      });
    });
  });

  describe('GET /api/v1/editorial/pages', () => {
    describe('HTTP authorization enforcement', () => {
      it('returns 401 Unauthorized when signed out', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages',
        });
        expect(response.statusCode).toBe(401);
      });

      it('returns 403 Forbidden for signed-in visitor', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages',
          cookies: { gk_session: 'visitor-session' },
        });
        expect(response.statusCode).toBe(403);
      });

      it('returns 403 Forbidden for signed-in teacher', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages',
          cookies: { gk_session: 'teacher-session' },
        });
        expect(response.statusCode).toBe(403);
      });

      it('returns 200 OK for signed-in admin and returns pages list', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('private, no-store');
        const body = JSON.parse(response.body) as {
          items: Array<{ id: string; pageType: string }>;
        };
        expect(body.items).toHaveLength(1);
        expect(body.items[0]!.pageType).toBe('about');
        expect(mockEditorialService.listPages).toHaveBeenCalledWith(20, 0, undefined);
      });
    });

    describe('query validation at request boundary', () => {
      it('rejects an explicitly empty offset with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages?offset=',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects malformed limit (20abc) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages?limit=20abc',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects fractional limit (1.5) with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages?limit=1.5',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects excessively large offset with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages?offset=100001',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('rejects invalid status with 400 Bad Request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages?status=invalid_status',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(400);
      });

      it('passes valid parameters and applies defaults when omitted', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/editorial/pages?limit=10&offset=20&status=in_review',
          cookies: { gk_session: 'admin-session' },
        });
        expect(response.statusCode).toBe(200);
        expect(mockEditorialService.listPages).toHaveBeenCalledWith(10, 20, 'in_review');
      });
    });
  });
});
