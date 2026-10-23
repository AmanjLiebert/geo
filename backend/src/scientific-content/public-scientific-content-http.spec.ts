import 'reflect-metadata';
import { NotFoundException, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { AccessGuard } from '../identity/access.guard';
import { SecurityAuditService } from '../identity/security-audit.service';
import { SessionService } from '../identity/session.service';
import { MediaService } from '../media/media.service';
import { PublicScientificContentController } from './public-scientific-content.controller';
import { PublicScientificContentService } from './public-scientific-content.service';

describe('public scientific HTTP boundary', () => {
  let app: NestFastifyApplication;
  const publicId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const content = {
    listCategories: vi.fn(),
    getCategory: vi.fn(),
    listRecords: vi.fn(),
    getRecord: vi.fn(),
    getCategoryImageAssetId: vi.fn(),
    getRecordImageAssetId: vi.fn(),
  };
  const media = { publicInlineImage: vi.fn() };
  const sessions = { authenticate: vi.fn() };
  const audit = { record: vi.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicScientificContentController],
      providers: [
        { provide: PublicScientificContentService, useValue: content },
        { provide: MediaService, useValue: media },
        { provide: SessionService, useValue: sessions },
        { provide: SecurityAuditService, useValue: audit },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: keyof Environment) => {
              if (key === 'AUTH_SESSION_COOKIE_NAME') return 'session';
              return undefined;
            }),
          },
        },
        { provide: APP_GUARD, useClass: AccessGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    vi.clearAllMocks();
    content.listCategories.mockResolvedValue({ items: [], total: 0, limit: 50, offset: 0 });
    content.getCategory.mockResolvedValue({ slug: 'rocks' });
    content.listRecords.mockResolvedValue({ items: [], total: 0, limit: 20, offset: 0 });
    content.getRecord.mockResolvedValue({ publicId });
    content.getCategoryImageAssetId.mockResolvedValue('image-1');
    content.getRecordImageAssetId.mockResolvedValue('image-1');
    media.publicInlineImage.mockResolvedValue({
      stream: Readable.from(Buffer.from('public-image')),
      contentType: 'image/webp',
      contentLength: 12,
    });
  });

  it('allows signed-out category and record reads without authenticating a session', async () => {
    const categories = await app.inject({
      method: 'GET',
      url: '/api/v1/public/scientific/categories',
    });
    const records = await app.inject({
      method: 'GET',
      url: '/api/v1/public/scientific/records',
    });
    expect(categories.statusCode).toBe(200);
    expect(records.statusCode).toBe(200);
    expect(categories.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
    expect(sessions.authenticate).not.toHaveBeenCalled();
  });

  it.each([
    '/api/v1/public/scientific/categories?limit=0',
    '/api/v1/public/scientific/categories?limit=20abc',
    '/api/v1/public/scientific/records?offset=-1',
    '/api/v1/public/scientific/records?locale=ckb',
    '/api/v1/public/scientific/records?category=../private',
  ])('rejects malformed public list input: %s', async (url) => {
    const response = await app.inject({ method: 'GET', url });
    expect(response.statusCode).toBe(400);
  });

  it('rejects malformed category paths and record public IDs', async () => {
    const badSlug = await app.inject({
      method: 'GET',
      url: '/api/v1/public/scientific/categories/Bad_Category',
    });
    const badId = await app.inject({
      method: 'GET',
      url: '/api/v1/public/scientific/records/not-a-uuid',
    });
    expect(badSlug.statusCode).toBe(400);
    expect(badId.statusCode).toBe(400);
  });

  it('returns a neutral 404 for unavailable public content', async () => {
    content.getCategory.mockRejectedValueOnce(
      new NotFoundException('Published category not found.'),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/scientific/categories/hidden-category',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).not.toHaveProperty('stack');
  });

  it('resolves public image viewing only after content eligibility succeeds', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/public/scientific/records/${publicId}/image`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['content-type']).toContain('image/webp');
    expect(response.body).toBe('public-image');
    expect(content.getRecordImageAssetId).toHaveBeenCalledWith(publicId);
    expect(media.publicInlineImage).toHaveBeenCalledWith('image-1');
  });

  it('does not call media delivery when a category image is not publicly eligible', async () => {
    content.getCategoryImageAssetId.mockRejectedValueOnce(
      new NotFoundException('Published image not found.'),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/public/scientific/categories/rocks/image',
    });
    expect(response.statusCode).toBe(404);
    expect(media.publicInlineImage).not.toHaveBeenCalled();
  });
});
