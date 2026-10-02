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
import { hashToken } from '../identity/identity.utils';
import { SecurityAuditService } from '../identity/security-audit.service';
import { SessionService } from '../identity/session.service';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { ScientificStructureController } from './scientific-structure.controller';
import { ScientificStructureService } from './scientific-structure.service';

describe('Records and ScientificStructure HTTP requests and authorization', () => {
  let app: NestFastifyApplication;

  const validRecordId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
  const validCategoryId = '11111111-1111-4111-8111-111111111111';
  const validRecordTypeId = '22222222-2222-4222-8222-222222222222';
  const validCsrf = 'test-csrf-token';
  const validCsrfHash = hashToken(validCsrf);

  const mockRecordsService = {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  };

  const mockScientificStructureService = {
    listCategories: vi.fn(),
    listRecordTypes: vi.fn(),
    getActiveTemplate: vi.fn(),
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
            csrfTokenHash: validCsrfHash,
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
            csrfTokenHash: validCsrfHash,
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
            csrfTokenHash: validCsrfHash,
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
      controllers: [RecordsController, ScientificStructureController],
      providers: [
        { provide: RecordsService, useValue: mockRecordsService },
        { provide: ScientificStructureService, useValue: mockScientificStructureService },
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
    mockRecordsService.get.mockResolvedValue({
      id: validRecordId,
      stableId: 'stable-1',
      slug: 'valid-record',
      status: 'draft',
      categoryId: validCategoryId,
      recordTypeId: validRecordTypeId,
      templateVersionId: 'tv-1',
      attributes: { formation: 'Bekhme' },
      ownerUserId: 'teacher-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      translations: [],
    });
    mockRecordsService.create.mockResolvedValue({
      id: validRecordId,
      stableId: 'stable-1',
      slug: 'valid-record',
      status: 'draft',
      categoryId: validCategoryId,
      recordTypeId: validRecordTypeId,
      templateVersionId: 'tv-1',
      attributes: { formation: 'Bekhme' },
      ownerUserId: 'teacher-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      translations: [],
    });
    mockRecordsService.update.mockResolvedValue({
      id: validRecordId,
      stableId: 'stable-1',
      slug: 'valid-record',
      status: 'draft',
      categoryId: validCategoryId,
      recordTypeId: validRecordTypeId,
      templateVersionId: 'tv-1',
      attributes: { formation: 'Bekhme' },
      ownerUserId: 'teacher-1',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
      translations: [],
    });
    mockScientificStructureService.listCategories.mockResolvedValue({
      items: [
        {
          id: validCategoryId,
          parentId: null,
          stableKey: 'fossils',
          slug: 'fossils',
          recordsAllowed: true,
          position: 1,
          name: 'Fossils',
          description: null,
          locale: 'en',
          translationAvailable: true,
        },
      ],
    });
    mockScientificStructureService.listRecordTypes.mockResolvedValue({
      items: [
        {
          id: validRecordTypeId,
          stableKey: 'occurrence',
          position: 1,
          name: 'Occurrence',
          description: null,
          activeTemplateVersionId: 'tv-1',
          locale: 'en',
          translationAvailable: true,
        },
      ],
    });
    mockScientificStructureService.getActiveTemplate.mockResolvedValue({
      id: 'tmpl-1',
      stableKey: 'fossil-occurrence',
      name: 'Fossil Occurrence',
      version: { id: 'tv-1', number: 1, status: 'active' },
      fields: [],
    });
  });

  describe('Authorization on scientific routes', () => {
    it('returns 401 Unauthorized when signed out for POST /api/v1/records', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        payload: { slug: 'test-slug' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 Forbidden for visitor on POST /api/v1/records', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: 'test-slug' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 201 Created for teacher on POST /api/v1/records', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          categoryId: validCategoryId,
          recordTypeId: validRecordTypeId,
          slug: 'valid-record',
          attributes: { formation: 'Bekhme' },
        },
      });
      expect(response.statusCode).toBe(201);
      expect(mockRecordsService.create).toHaveBeenCalledWith('teacher-1', {
        categoryId: validCategoryId,
        recordTypeId: validRecordTypeId,
        slug: 'valid-record',
        attributes: { formation: 'Bekhme' },
      });
    });

    it('returns 201 Created for admin on POST /api/v1/records', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'admin-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          categoryId: validCategoryId,
          recordTypeId: validRecordTypeId,
          slug: 'valid-record',
          attributes: { formation: 'Bekhme' },
        },
      });
      expect(response.statusCode).toBe(201);
      expect(mockRecordsService.create).toHaveBeenCalledWith('admin-1', {
        categoryId: validCategoryId,
        recordTypeId: validRecordTypeId,
        slug: 'valid-record',
        attributes: { formation: 'Bekhme' },
      });
    });

    it('returns 403 Forbidden for visitor on GET /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'visitor-session' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 200 OK for teacher on GET /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRecordsService.get).toHaveBeenCalledWith(validRecordId);
    });

    it('returns 403 Forbidden for visitor on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: 'updated-slug' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 200 OK for teacher on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: 'updated-slug', attributes: { formation: 'Shiranish' } },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRecordsService.update).toHaveBeenCalledWith('teacher-1', validRecordId, {
        slug: 'updated-slug',
        attributes: { formation: 'Shiranish' },
      });
    });

    it('returns 403 Forbidden for visitor on GET /api/v1/scientific-structure/categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scientific-structure/categories',
        cookies: { gk_session: 'visitor-session' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 200 OK for teacher on GET /api/v1/scientific-structure/categories', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scientific-structure/categories',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockScientificStructureService.listCategories).toHaveBeenCalledWith('en');
    });

    it('returns 200 OK for teacher on GET /api/v1/scientific-structure/categories/:id/record-types', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/categories/${validCategoryId}/record-types`,
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockScientificStructureService.listRecordTypes).toHaveBeenCalledWith(
        validCategoryId,
        'en',
      );
    });

    it('returns 200 OK for teacher on GET /api/v1/scientific-structure/templates/active', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/templates/active?categoryId=${validCategoryId}&recordTypeId=${validRecordTypeId}`,
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockScientificStructureService.getActiveTemplate).toHaveBeenCalledWith(
        validCategoryId,
        validRecordTypeId,
        'en',
      );
    });
  });

  describe('Validation of input boundaries', () => {
    it('rejects invalid UUID in record route parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/records/not-a-valid-uuid',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects malformed slug in create record payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          slug: 'Invalid Slug With Spaces!',
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects non-object attributes in create record payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          attributes: 'not-an-object',
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects non-whitelisted fields in create record payload', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          unauthorizedField: 'malicious',
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects missing categoryId/recordTypeId on active template query', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scientific-structure/templates/active',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
