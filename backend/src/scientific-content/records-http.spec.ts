import 'reflect-metadata';
import cookie from '@fastify/cookie';
import {
  ConflictException,
  UnauthorizedException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
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
import { ResearchController } from '../research/research.controller';
import { ResearchService } from '../research/research.service';
import { ScientificTrustController } from '../publishing/scientific-trust.controller';
import { ScientificTrustService } from '../publishing/scientific-trust.service';
import { MediaController } from '../media/media.controller';
import { MediaService } from '../media/media.service';
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
    upsertTranslation: vi.fn(),
  };

  const mockResearchService = { list: vi.fn() };
  const mockTrustService = {
    listReferences: vi.fn(),
    getReference: vi.fn(),
    listEvidence: vi.fn(),
    listLocations: vi.fn(),
    listRelationships: vi.fn(),
    addEvidence: vi.fn(),
    addLocation: vi.fn(),
    addRelationship: vi.fn(),
    createReference: vi.fn(),
  };
  const mockMediaService = {
    listRecordAttachments: vi.fn(),
    attachToRecord: vi.fn(),
    initiate: vi.fn(),
    confirm: vi.fn(),
  };

  const mockScientificStructureService = {
    listCategories: vi.fn(),
    createCategory: vi.fn(),
    editCategory: vi.fn(),
    previewCategoryArchive: vi.fn(),
    setCategoryArchive: vi.fn(),
    getCategoryReadiness: vi.fn(),
    publishCategory: vi.fn(),
    unpublishCategory: vi.fn(),
    listRecordTypes: vi.fn(),
    getActiveTemplate: vi.fn(),
    getTemplateVersion: vi.fn(),
    listStructureRequests: vi.fn(),
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
      controllers: [
        RecordsController,
        ScientificStructureController,
        ResearchController,
        ScientificTrustController,
        MediaController,
      ],
      providers: [
        { provide: RecordsService, useValue: mockRecordsService },
        { provide: ResearchService, useValue: mockResearchService },
        { provide: ScientificTrustService, useValue: mockTrustService },
        { provide: MediaService, useValue: mockMediaService },
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
    const emptyList = { items: [], total: 0, limit: 50, offset: 0 };
    mockRecordsService.list.mockResolvedValue(emptyList);
    mockResearchService.list.mockResolvedValue(emptyList);
    mockScientificStructureService.listStructureRequests.mockResolvedValue(emptyList);
    mockScientificStructureService.createCategory.mockResolvedValue({
      id: validCategoryId,
      publicationStatus: 'draft',
    });
    mockScientificStructureService.editCategory.mockResolvedValue({
      id: validCategoryId,
      publicationStatus: 'draft',
      revisionSaved: true,
    });
    mockScientificStructureService.previewCategoryArchive.mockResolvedValue({
      categoryCount: 2,
      recordCount: 3,
      status: 'active',
    });
    mockScientificStructureService.setCategoryArchive.mockResolvedValue({
      categoryCount: 2,
      recordCount: 3,
      status: 'archived',
    });
    mockTrustService.listEvidence.mockResolvedValue({ items: [] });
    mockTrustService.listReferences.mockResolvedValue({
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
    });
    mockTrustService.getReference.mockResolvedValue({
      id: validRecordId,
      title: 'Sample reference',
    });
    mockTrustService.listLocations.mockResolvedValue({ items: [] });
    mockTrustService.listRelationships.mockResolvedValue({ items: [] });
    mockMediaService.listRecordAttachments.mockResolvedValue({ items: [] });
    mockRecordsService.upsertTranslation.mockResolvedValue({ id: validRecordId });
    mockTrustService.addRelationship.mockResolvedValue({ id: validRecordId });
    mockTrustService.createReference.mockResolvedValue({ id: validRecordId });
    mockTrustService.addLocation.mockResolvedValue({ id: validRecordId });
    mockMediaService.initiate.mockResolvedValue({ mediaAssetId: validRecordId });
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

  describe('List query boundaries', () => {
    const paths = ['/api/v1/records', '/api/v1/research', '/api/v1/scientific-structure/requests'];

    it.each(paths)('rejects malformed pagination on %s', async (path) => {
      for (const query of [
        'limit=20abc',
        'limit=1.5',
        'limit=1e2',
        'limit=0',
        'limit=101',
        'offset=-1',
        'offset=100001',
        'offset=20abc',
        'limit=1&limit=2',
      ]) {
        const response = await app.inject({
          method: 'GET',
          url: `${path}?${query}`,
          cookies: { gk_session: 'teacher-session' },
        });
        expect(response.statusCode, `${path}?${query}`).toBe(400);
      }
    });

    it.each([
      ['/api/v1/records', mockRecordsService.list],
      ['/api/v1/research', mockResearchService.list],
      [
        '/api/v1/scientific-structure/requests',
        mockScientificStructureService.listStructureRequests,
      ],
    ])('passes validated pagination to %s', async (path, list) => {
      const response = await app.inject({
        method: 'GET',
        url: `${path}?limit=25&offset=10`,
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(list).toHaveBeenCalledWith(
        25,
        10,
        ...(path === '/api/v1/scientific-structure/requests' ? [] : [undefined]),
      );
    });

    it.each(paths)('denies visitor list access on %s', async (path) => {
      const response = await app.inject({
        method: 'GET',
        url: path,
        cookies: { gk_session: 'visitor-session' },
      });
      expect(response.statusCode).toBe(403);
    });

    it.each(paths)('requires a session on %s', async (path) => {
      const response = await app.inject({ method: 'GET', url: path });
      expect(response.statusCode).toBe(401);
    });

    it('uses defaults and retains the record status filter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/records?status=draft',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRecordsService.list).toHaveBeenCalledWith(50, 0, 'draft');
    });
  });

  describe('Record attachment reads', () => {
    const paths = [
      `/api/v1/records/${validRecordId}/evidence`,
      `/api/v1/records/${validRecordId}/locations`,
      `/api/v1/records/${validRecordId}/relationships`,
      `/api/v1/media/records/${validRecordId}/attachments`,
    ];

    it.each(paths)('allows teachers and admins to read %s privately', async (path) => {
      for (const session of ['teacher-session', 'admin-session']) {
        const response = await app.inject({
          method: 'GET',
          url: path,
          cookies: { gk_session: session },
        });
        expect(response.statusCode).toBe(200);
        expect(response.headers['cache-control']).toBe('private, no-store');
        expect(response.json()).toEqual({ items: [] });
      }
    });

    it.each(paths)('denies signed-out and visitor access to %s', async (path) => {
      const signedOut = await app.inject({ method: 'GET', url: path });
      const visitor = await app.inject({
        method: 'GET',
        url: path,
        cookies: { gk_session: 'visitor-session' },
      });
      expect(signedOut.statusCode).toBe(401);
      expect(visitor.statusCode).toBe(403);
    });

    it('rejects malformed reference and media IDs before the service runs', async () => {
      const request = {
        method: 'POST' as const,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      };
      const evidence = await app.inject({
        ...request,
        url: `/api/v1/records/${validRecordId}/evidence`,
        payload: { referenceId: 'invalid', evidenceKind: 'field_observation' },
      });
      const media = await app.inject({
        ...request,
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: { mediaAssetId: 'invalid', purpose: 'field photo' },
      });
      expect(evidence.statusCode).toBe(400);
      expect(media.statusCode).toBe(400);
      expect(mockTrustService.addEvidence).not.toHaveBeenCalled();
      expect(mockMediaService.attachToRecord).not.toHaveBeenCalled();
    });

    it('rejects malformed embargo dates before storing a location', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/records/${validRecordId}/locations`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          exactLatitude: 36,
          exactLongitude: 44,
          visibility: 'embargoed',
          sensitivityReason: 'Protected site',
          embargoUntil: 'tomorrow-ish',
        },
      });
      expect(response.statusCode).toBe(400);
      expect(mockTrustService.addLocation).not.toHaveBeenCalled();
    });
  });

  describe('Saved-record detail writes', () => {
    const routes = [
      {
        method: 'PUT' as const,
        url: `/api/v1/records/${validRecordId}/translations/en`,
        payload: { title: 'Fossil occurrence', summary: '', description: '' },
      },
      {
        method: 'POST' as const,
        url: `/api/v1/records/${validRecordId}/relationships`,
        payload: {
          targetType: 'record',
          targetId: validCategoryId,
          relationshipType: 'related_to',
        },
      },
      {
        method: 'POST' as const,
        url: '/api/v1/references',
        payload: {
          sourceType: 'journal',
          authors: [{ name: 'Researcher' }],
          title: 'Study',
          identifier: 'doi:example',
        },
      },
      {
        method: 'POST' as const,
        url: `/api/v1/records/${validRecordId}/locations`,
        payload: {
          exactLatitude: 36,
          exactLongitude: 44,
          visibility: 'restricted',
          sensitivityReason: 'Protected site',
        },
      },
      {
        method: 'POST' as const,
        url: '/api/v1/media/uploads',
        payload: {
          filename: 'field.png',
          contentType: 'image/png',
          byteSize: 100,
          rightsStatement: 'Author owned',
        },
      },
    ];

    it.each(routes)('enforces role and CSRF checks on $url', async (route) => {
      const signedOut = await app.inject({
        method: route.method,
        url: route.url,
        payload: route.payload,
      });
      const visitor = await app.inject({
        method: route.method,
        url: route.url,
        payload: route.payload,
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      const missingCsrf = await app.inject({
        method: route.method,
        url: route.url,
        payload: route.payload,
        cookies: { gk_session: 'teacher-session' },
      });
      const teacher = await app.inject({
        method: route.method,
        url: route.url,
        payload: route.payload,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      const admin = await app.inject({
        method: route.method,
        url: route.url,
        payload: route.payload,
        cookies: { gk_session: 'admin-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(signedOut.statusCode).toBe(401);
      expect(visitor.statusCode).toBe(403);
      expect(missingCsrf.statusCode).toBe(403);
      expect(teacher.statusCode).toBeGreaterThanOrEqual(200);
      expect(teacher.statusCode).toBeLessThan(300);
      expect(admin.statusCode).toBeGreaterThanOrEqual(200);
      expect(admin.statusCode).toBeLessThan(300);
      if (route.url === '/api/v1/media/uploads') {
        expect(teacher.headers['cache-control']).toBe('private, no-store');
      }
    });
  });

  describe('Reference lookup', () => {
    it('allows teachers to search with bounded pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/references?q=fossil&limit=20&offset=5',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(mockTrustService.listReferences).toHaveBeenCalledWith(20, 5, 'fossil');
    });

    it('rejects malformed and excessive reference searches', async () => {
      for (const query of ['limit=20abc', 'offset=-1', `q=${'x'.repeat(121)}`, 'q=a&q=b']) {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/references?${query}`,
          cookies: { gk_session: 'teacher-session' },
        });
        expect(response.statusCode, query).toBe(400);
      }
    });

    it('does not expose references to visitors or signed-out users', async () => {
      for (const url of ['/api/v1/references', `/api/v1/references/${validRecordId}`]) {
        const signedOut = await app.inject({ method: 'GET', url });
        const visitor = await app.inject({
          method: 'GET',
          url,
          cookies: { gk_session: 'visitor-session' },
        });
        expect(signedOut.statusCode).toBe(401);
        expect(visitor.statusCode).toBe(403);
      }
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

    it('passes slug: null to service when slug is explicitly cleared on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: null, attributes: { formation: 'Shiranish' } },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRecordsService.update).toHaveBeenCalledWith('teacher-1', validRecordId, {
        slug: null,
        attributes: { formation: 'Shiranish' },
      });
    });

    it('passes slug: undefined when slug is omitted in PATCH /api/v1/records/:id payload', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { attributes: { formation: 'Shiranish' } },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRecordsService.update).toHaveBeenCalledWith('teacher-1', validRecordId, {
        attributes: { formation: 'Shiranish' },
      });
    });

    it('transforms empty string slug to null on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: '', attributes: { formation: 'Shiranish' } },
      });
      expect(response.statusCode).toBe(200);
      expect(mockRecordsService.update).toHaveBeenCalledWith('teacher-1', validRecordId, {
        slug: null,
        attributes: { formation: 'Shiranish' },
      });
    });

    it('rejects invalid slug format with 400 Bad Request on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: 'INVALID SLUG WITH SPACES' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects numeric slug with 400 Bad Request on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: 42 },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects array slug with 400 Bad Request on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: ['a'] },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects object slug with 400 Bad Request on PATCH /api/v1/records/:id', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: {} },
      });
      expect(response.statusCode).toBe(400);
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

    it('rejects non-uuid versionId for template-versions endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/scientific-structure/template-versions/not-a-uuid',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('allows teacher to load pinned template version', async () => {
      mockScientificStructureService.getTemplateVersion.mockResolvedValueOnce({
        id: 'tmpl-1',
        stableKey: 'carbonate_rock',
        name: 'Carbonate Rock',
        version: { id: validRecordId, number: 1, status: 'superseded' },
        fields: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/template-versions/${validRecordId}`,
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      expect(mockScientificStructureService.getTemplateVersion).toHaveBeenCalledWith(
        validRecordId,
        'en',
      );
    });

    it('allows admin to load pinned template version', async () => {
      mockScientificStructureService.getTemplateVersion.mockResolvedValueOnce({
        id: 'tmpl-1',
        stableKey: 'carbonate_rock',
        name: 'Carbonate Rock',
        version: { id: validRecordId, number: 1, status: 'superseded' },
        fields: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/template-versions/${validRecordId}`,
        cookies: { gk_session: 'admin-session' },
      });
      expect(response.statusCode).toBe(200);
    });

    it('denies visitor from loading pinned template version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/template-versions/${validRecordId}`,
        cookies: { gk_session: 'visitor-session' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('denies unauthenticated request from loading pinned template version', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/template-versions/${validRecordId}`,
      });
      expect(response.statusCode).toBe(401);
    });
  });
  describe('category creation boundary', () => {
    const payload = {
      title: 'New category',
      summary: 'A geological subject',
      description: 'A collection of geological observations.',
    };

    it.each(['teacher-session', 'admin-session'])(
      'allows %s to create an unpublished category',
      async (session) => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/scientific-structure/categories',
          cookies: { gk_session: session, gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
          payload,
        });
        expect(response.statusCode).toBe(201);
        expect(response.body).toContain('"publicationStatus":"draft"');
        expect(mockScientificStructureService.createCategory).toHaveBeenCalledWith(
          expect.any(String),
          payload,
        );
      },
    );

    it('denies visitors, signed-out users, and requests without CSRF', async () => {
      const visitor = await app.inject({
        method: 'POST',
        url: '/api/v1/scientific-structure/categories',
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload,
      });
      const signedOut = await app.inject({
        method: 'POST',
        url: '/api/v1/scientific-structure/categories',
        payload,
      });
      const noCsrf = await app.inject({
        method: 'POST',
        url: '/api/v1/scientific-structure/categories',
        cookies: { gk_session: 'teacher-session' },
        payload,
      });
      expect(visitor.statusCode).toBe(403);
      expect(signedOut.statusCode).toBe(401);
      expect(noCsrf.statusCode).toBe(403);
      expect(mockScientificStructureService.createCategory).not.toHaveBeenCalled();
    });

    it('rejects missing content and unknown properties', async () => {
      for (const invalid of [
        { ...payload, summary: '' },
        { ...payload, role: 'admin' },
        { ...payload, parentId: 'not-a-uuid' },
      ]) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/scientific-structure/categories',
          cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
          payload: invalid,
        });
        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('category draft edit boundary', () => {
    const payload = {
      title: 'Revised category',
      summary: 'Revised summary',
      description: 'Revised description',
      imageMediaAssetId: null,
      position: 2,
    };

    it.each(['teacher-session', 'admin-session'])(
      'allows %s to save an unpublished revision',
      async (session) => {
        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}`,
          cookies: { gk_session: session, gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
          payload,
        });
        expect(response.statusCode).toBe(200);
        expect(response.body).toContain('"revisionSaved":true');
      },
    );

    it('denies visitors and signed-out requests', async () => {
      for (const session of ['visitor-session', undefined]) {
        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}`,
          cookies: session ? { gk_session: session, gk_csrf: validCsrf } : undefined,
          headers: session ? { 'x-csrf-token': validCsrf } : undefined,
          payload,
        });
        expect(response.statusCode).toBe(session ? 403 : 401);
      }
    });

    it('rejects hierarchy changes and invalid order', async () => {
      for (const invalid of [
        { ...payload, parentId: validCategoryId },
        { ...payload, position: -1 },
      ]) {
        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}`,
          cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
          payload: invalid,
        });
        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('category archive and restore boundary', () => {
    const impact = { categoryCount: 2, recordCount: 3 };

    it.each(['teacher-session', 'admin-session'])(
      'allows %s to preview and confirm an archive',
      async (session) => {
        const preview = await app.inject({
          method: 'GET',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/archive-preview`,
          cookies: { gk_session: session },
        });
        expect(preview.statusCode).toBe(200);
        const archived = await app.inject({
          method: 'POST',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/archive`,
          cookies: { gk_session: session, gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
          payload: impact,
        });
        expect(archived.statusCode).toBe(201);
        expect(mockScientificStructureService.setCategoryArchive).toHaveBeenCalledWith(
          expect.any(String),
          validCategoryId,
          false,
          impact,
        );
      },
    );

    it('allows restore with confirmed impact', async () => {
      mockScientificStructureService.setCategoryArchive.mockResolvedValueOnce({
        ...impact,
        status: 'active',
      });
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/scientific-structure/categories/${validCategoryId}/restore`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: impact,
      });
      expect(response.statusCode).toBe(201);
      expect(mockScientificStructureService.setCategoryArchive).toHaveBeenCalledWith(
        'teacher-1',
        validCategoryId,
        true,
        impact,
      );
    });

    it('denies visitors, signed-out requests, missing CSRF, and invalid impact', async () => {
      const visitor = await app.inject({
        method: 'POST',
        url: `/api/v1/scientific-structure/categories/${validCategoryId}/archive`,
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: impact,
      });
      const signedOut = await app.inject({
        method: 'GET',
        url: `/api/v1/scientific-structure/categories/${validCategoryId}/archive-preview`,
      });
      const noCsrf = await app.inject({
        method: 'POST',
        url: `/api/v1/scientific-structure/categories/${validCategoryId}/archive`,
        cookies: { gk_session: 'teacher-session' },
        payload: impact,
      });
      const invalid = await app.inject({
        method: 'POST',
        url: `/api/v1/scientific-structure/categories/${validCategoryId}/archive`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { categoryCount: 0, recordCount: -1 },
      });
      expect(visitor.statusCode).toBe(403);
      expect(signedOut.statusCode).toBe(401);
      expect(noCsrf.statusCode).toBe(403);
      expect(invalid.statusCode).toBe(400);
    });
  });

  describe('category readiness and publication boundary', () => {
    it.each(['teacher-session', 'admin-session'])(
      'allows %s to check category readiness',
      async (session) => {
        mockScientificStructureService.getCategoryReadiness.mockResolvedValueOnce({
          categoryId: validCategoryId,
          publishable: true,
          issues: [],
        });
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/readiness`,
          cookies: { gk_session: session },
        });
        expect(response.statusCode).toBe(200);
        expect(response.body).toContain('"publishable":true');
        expect(mockScientificStructureService.getCategoryReadiness).toHaveBeenCalledWith(validCategoryId);
      },
    );

    it.each(['teacher-session', 'admin-session'])(
      'allows %s to publish a complete category',
      async (session) => {
        mockScientificStructureService.publishCategory.mockResolvedValueOnce({
          id: validCategoryId,
          publicationStatus: 'published',
          promotedDraft: true,
        });
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/publish`,
          cookies: { gk_session: session, gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
        });
        expect(response.statusCode).toBe(201);
        expect(response.body).toContain('"publicationStatus":"published"');
        expect(mockScientificStructureService.publishCategory).toHaveBeenCalledWith(
          expect.any(String),
          validCategoryId,
        );
      },
    );

    it.each(['teacher-session', 'admin-session'])(
      'allows %s to unpublish a category',
      async (session) => {
        mockScientificStructureService.unpublishCategory.mockResolvedValueOnce({
          id: validCategoryId,
          publicationStatus: 'draft',
        });
        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/unpublish`,
          cookies: { gk_session: session, gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
        });
        expect(response.statusCode).toBe(201);
        expect(response.body).toContain('"publicationStatus":"draft"');
        expect(mockScientificStructureService.unpublishCategory).toHaveBeenCalledWith(
          expect.any(String),
          validCategoryId,
        );
      },
    );

    it('denies visitors and signed-out requests on readiness, publish, and unpublish', async () => {
      for (const endpoint of ['readiness', 'publish', 'unpublish']) {
        const isGet = endpoint === 'readiness';
        const method = isGet ? 'GET' : 'POST';
        const visitor = await app.inject({
          method,
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/${endpoint}`,
          cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
          headers: isGet ? undefined : { 'x-csrf-token': validCsrf },
        });
        const signedOut = await app.inject({
          method,
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/${endpoint}`,
        });
        expect(visitor.statusCode, `visitor ${endpoint}`).toBe(403);
        expect(signedOut.statusCode, `signedOut ${endpoint}`).toBe(401);
      }
    });

    it('denies mutating publish and unpublish requests without valid CSRF', async () => {
      for (const endpoint of ['publish', 'unpublish']) {
        const noCsrf = await app.inject({
          method: 'POST',
          url: `/api/v1/scientific-structure/categories/${validCategoryId}/${endpoint}`,
          cookies: { gk_session: 'teacher-session' },
        });
        expect(noCsrf.statusCode, `noCsrf ${endpoint}`).toBe(403);
      }
    });

    it('rejects invalid category UUID parameter', async () => {
      for (const endpoint of ['readiness', 'publish', 'unpublish']) {
        const method = endpoint === 'readiness' ? 'GET' : 'POST';
        const response = await app.inject({
          method,
          url: `/api/v1/scientific-structure/categories/invalid-uuid/${endpoint}`,
          cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
        });
        expect(response.statusCode).toBe(400);
      }
    });
  });

  describe('managed category record entry and reopening boundary', () => {
    const payload = {
      categoryId: validCategoryId,
      recordTypeId: validRecordTypeId,
      slug: 'managed-record-slug',
      attributes: {},
    };

    it.each(['teacher-session', 'admin-session'])(
      'allows %s to create a General geological draft under a managed category',
      async (session) => {
        mockRecordsService.create.mockResolvedValueOnce({
          id: validRecordId,
          status: 'draft',
          categoryId: validCategoryId,
          recordTypeId: validRecordTypeId,
          templateVersionId: 'tv-general-v1',
          attributes: {},
          translations: [],
        });

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/records',
          cookies: { gk_session: session, gk_csrf: validCsrf },
          headers: { 'x-csrf-token': validCsrf },
          payload,
        });

        expect(response.statusCode).toBe(201);
        expect(response.body).toContain(validRecordId);
        expect(mockRecordsService.create).toHaveBeenCalledWith(
          expect.any(String),
          payload,
        );
      },
    );

    it('allows teacher and admin to reopen a saved draft record', async () => {
      mockRecordsService.get.mockResolvedValueOnce({
        id: validRecordId,
        stableId: 'stable-uuid',
        status: 'draft',
        categoryId: validCategoryId,
        recordTypeId: validRecordTypeId,
        templateVersionId: 'tv-general-v1',
        attributes: {},
        ownerUserId: 'teacher-1',
        createdAt: '2026-10-16T12:00:00.000Z',
        updatedAt: '2026-10-16T12:00:00.000Z',
        translations: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('"status":"draft"');
      expect(response.body).toContain(validCategoryId);
      expect(mockRecordsService.get).toHaveBeenCalledWith(validRecordId);
    });

    it('denies visitor and signed-out requests from creating or reopening records', async () => {
      const visitorCreate = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload,
      });
      const signedOutCreate = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        payload,
      });
      const visitorGet = await app.inject({
        method: 'GET',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'visitor-session' },
      });
      const signedOutGet = await app.inject({
        method: 'GET',
        url: `/api/v1/records/${validRecordId}`,
      });

      expect(visitorCreate.statusCode).toBe(403);
      expect(signedOutCreate.statusCode).toBe(401);
      expect(visitorGet.statusCode).toBe(403);
      expect(signedOutGet.statusCode).toBe(401);
    });

    it('rejects malformed record ID and invalid category UUID format', async () => {
      const invalidGet = await app.inject({
        method: 'GET',
        url: '/api/v1/records/not-a-uuid',
        cookies: { gk_session: 'teacher-session' },
      });
      const invalidPost = await app.inject({
        method: 'POST',
        url: '/api/v1/records',
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { ...payload, categoryId: 'not-a-uuid' },
      });

      expect(invalidGet.statusCode).toBe(400);
      expect(invalidPost.statusCode).toBe(400);
    });

    it('returns 409 Conflict across all draft mutation endpoints when category branch is archived', async () => {
      const conflictError = new ConflictException(
        'The category for this record is archived or inactive.',
      );
      mockRecordsService.update.mockRejectedValueOnce(conflictError);
      mockRecordsService.upsertTranslation.mockRejectedValueOnce(conflictError);
      mockTrustService.addEvidence.mockRejectedValueOnce(conflictError);
      mockTrustService.addLocation.mockRejectedValueOnce(conflictError);
      mockTrustService.addRelationship.mockRejectedValueOnce(conflictError);
      mockMediaService.attachToRecord.mockRejectedValueOnce(conflictError);

      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/v1/records/${validRecordId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { slug: 'test-slug' },
      });
      const transRes = await app.inject({
        method: 'PUT',
        url: `/api/v1/records/${validRecordId}/translations/en`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { title: 'Draft Title' },
      });
      const evidenceRes = await app.inject({
        method: 'POST',
        url: `/api/v1/records/${validRecordId}/evidence`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: { referenceId: validCategoryId, evidenceKind: 'field_observation' },
      });
      const locationRes = await app.inject({
        method: 'POST',
        url: `/api/v1/records/${validRecordId}/locations`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          exactLatitude: 36,
          exactLongitude: 44,
          publicLatitude: 36,
          publicLongitude: 44,
          visibility: 'public',
        },
      });
      const relRes = await app.inject({
        method: 'POST',
        url: `/api/v1/records/${validRecordId}/relationships`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          targetType: 'record',
          targetId: validCategoryId,
          relationshipType: 'related_to',
        },
      });
      const mediaRes = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
        payload: {
          mediaAssetId: validCategoryId,
          purpose: 'field photo',
        },
      });

      expect(updateRes.statusCode).toBe(409);
      expect(transRes.statusCode).toBe(409);
      expect(evidenceRes.statusCode).toBe(409);
      expect(locationRes.statusCode).toBe(409);
      expect(relRes.statusCode).toBe(409);
      expect(mediaRes.statusCode).toBe(409);
    });
  });
});
