import 'reflect-metadata';
import cookie from '@fastify/cookie';
import {
  ConflictException,
  NotFoundException,
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
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

describe('MediaController HTTP requests and authorization', () => {
  let app: NestFastifyApplication;

  const validRecordId = '11111111-1111-4111-8111-111111111111';
  const validMediaAssetId = '22222222-2222-4222-8222-222222222222';
  const secondAssetId = '33333333-3333-4333-8333-333333333333';
  const validCsrf = 'test-csrf-token';
  const validCsrfHash = hashToken(validCsrf);

  const mockMediaService = {
    initiate: vi.fn(),
    confirm: vi.fn(),
    viewerUrl: vi.fn(),
    attachToRecord: vi.fn(),
    listRecordAttachments: vi.fn(),
    updateAttachment: vi.fn(),
    setPrimaryAttachment: vi.fn(),
    reorderAttachments: vi.fn(),
    detachFromRecord: vi.fn(),
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
      controllers: [MediaController],
      providers: [
        { provide: MediaService, useValue: mockMediaService },
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
    mockMediaService.listRecordAttachments.mockResolvedValue({
      items: [
        {
          mediaAssetId: validMediaAssetId,
          purpose: 'field photo',
          position: 0,
          caption: 'North cliff outcrop',
          description: 'Stratigraphic layer exposed by road cut.',
          altText: 'Exposed limestone bedding planes.',
          isPrimary: true,
          mediaKind: 'image',
          processingStatus: 'approved',
          filename: 'outcrop.jpg',
          rightsStatement: 'CC-BY-4.0',
          licence: 'CC-BY-4.0',
          credit: 'Field Survey Team',
        },
      ],
    });
    mockMediaService.attachToRecord.mockResolvedValue({
      recordId: validRecordId,
      mediaAssetId: validMediaAssetId,
      purpose: 'field photo',
      caption: 'North cliff outcrop',
      description: null,
      altText: 'Exposed limestone',
      position: 0,
      isPrimary: true,
    });
    mockMediaService.updateAttachment.mockResolvedValue({
      recordId: validRecordId,
      mediaAssetId: validMediaAssetId,
      purpose: 'field photo',
      caption: 'Updated caption',
      description: 'Updated description',
      altText: 'Updated alt',
      position: 1,
      isPrimary: true,
    });
    mockMediaService.setPrimaryAttachment.mockResolvedValue({
      recordId: validRecordId,
      mediaAssetId: validMediaAssetId,
      isPrimary: true,
    });
    mockMediaService.reorderAttachments.mockResolvedValue({
      items: [
        { mediaAssetId: secondAssetId, position: 0 },
        { mediaAssetId: validMediaAssetId, position: 1 },
      ],
    });
    mockMediaService.detachFromRecord.mockResolvedValue({
      success: true,
      recordId: validRecordId,
      mediaAssetId: validMediaAssetId,
    });
  });

  describe('GET /api/v1/media/records/:recordId/attachments', () => {
    it('returns 401 when signed out', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 when visitor', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        cookies: { gk_session: 'visitor-session' },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 200 with attachments list for teacher', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = response.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(data.items).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(data.items[0].mediaAssetId).toBe(validMediaAssetId);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(data.items[0].caption).toBe('North cliff outcrop');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(data.items[0].isPrimary).toBe(true);
      // Projection check: no internal storage keys
      expect(JSON.stringify(data)).not.toContain('storage_key');
      expect(JSON.stringify(data)).not.toContain('derivative_storage_key');
    });

    it('returns 400 for malformed record UUID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/media/records/not-a-uuid/attachments',
        cookies: { gk_session: 'teacher-session' },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/media/records/:recordId/attachments', () => {
    const validBody = {
      mediaAssetId: validMediaAssetId,
      purpose: 'field photo',
      caption: 'North cliff outcrop',
      description: 'Stratigraphic layer exposed by road cut.',
      altText: 'Exposed limestone bedding planes.',
      position: 0,
      isPrimary: true,
    };

    it('returns 401 when signed out', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: validBody,
      });
      expect(response.statusCode).toBe(401);
    });

    it('returns 403 for visitor', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: validBody,
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(403);
    });

    it('returns 201 for teacher with valid payload and csrf', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: validBody,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(201);
      expect(mockMediaService.attachToRecord).toHaveBeenCalledWith(
        'teacher-1',
        validRecordId,
        expect.objectContaining(validBody),
      );
    });

    it('rejects caption longer than 160 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: { ...validBody, caption: 'a'.repeat(161) },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects description longer than 2000 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: { ...validBody, description: 'a'.repeat(2001) },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(400);
    });

    it('rejects altText longer than 500 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: { ...validBody, altText: 'a'.repeat(501) },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(400);
    });

    it('returns 409 when service rejects non-editable record', async () => {
      mockMediaService.attachToRecord.mockRejectedValueOnce(
        new ConflictException('This record cannot be edited in its current state.'),
      );
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments`,
        payload: validBody,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('PATCH /api/v1/media/records/:recordId/attachments/:mediaAssetId', () => {
    it('returns 200 when teacher updates metadata', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/media/records/${validRecordId}/attachments/${validMediaAssetId}`,
        payload: {
          caption: 'Updated caption',
          description: 'Updated description',
          isPrimary: true,
        },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(200);
      expect(mockMediaService.updateAttachment).toHaveBeenCalledWith(
        'teacher-1',
        validRecordId,
        validMediaAssetId,
        expect.objectContaining({ caption: 'Updated caption', isPrimary: true }),
      );
    });

    it('returns 404 when attachment not found', async () => {
      mockMediaService.updateAttachment.mockRejectedValueOnce(
        new NotFoundException('Attachment not found on this record.'),
      );
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/media/records/${validRecordId}/attachments/${validMediaAssetId}`,
        payload: { caption: 'Updated' },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/media/records/:recordId/attachments/:mediaAssetId/primary', () => {
    it('returns 201 when selecting primary image', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/media/records/${validRecordId}/attachments/${validMediaAssetId}/primary`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(201);
      expect(mockMediaService.setPrimaryAttachment).toHaveBeenCalledWith(
        'teacher-1',
        validRecordId,
        validMediaAssetId,
      );
    });
  });

  describe('PUT /api/v1/media/records/:recordId/attachments/order', () => {
    it('returns 200 when reordering attachments', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/media/records/${validRecordId}/attachments/order`,
        payload: { mediaAssetIds: [secondAssetId, validMediaAssetId] },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(200);
      expect(mockMediaService.reorderAttachments).toHaveBeenCalledWith('teacher-1', validRecordId, [
        secondAssetId,
        validMediaAssetId,
      ]);
    });

    it('returns 400 when mediaAssetIds is empty', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/media/records/${validRecordId}/attachments/order`,
        payload: { mediaAssetIds: [] },
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/v1/media/records/:recordId/attachments/:mediaAssetId', () => {
    it('returns 200 when detaching attachment', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/media/records/${validRecordId}/attachments/${validMediaAssetId}`,
        cookies: { gk_session: 'teacher-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(200);
      expect(mockMediaService.detachFromRecord).toHaveBeenCalledWith(
        'teacher-1',
        validRecordId,
        validMediaAssetId,
      );
    });

    it('returns 403 for visitor', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/media/records/${validRecordId}/attachments/${validMediaAssetId}`,
        cookies: { gk_session: 'visitor-session', gk_csrf: validCsrf },
        headers: { 'x-csrf-token': validCsrf },
      });
      expect(response.statusCode).toBe(403);
    });
  });
});
