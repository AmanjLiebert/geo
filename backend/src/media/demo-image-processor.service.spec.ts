import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Environment } from '../config/environment';
import { DemoImageProcessorService, sanitizeDemoImage } from './demo-image-processor.service';

const { s3Send } = vi.hoisted(() => ({ s3Send: vi.fn() }));

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const original = await importOriginal<typeof import('@aws-sdk/client-s3')>();
  return {
    ...original,
    S3Client: class {
      send = s3Send;
    },
  };
});

describe('demo image sanitization', () => {
  it('fully decodes and re-encodes a metadata-free WebP display and thumbnail', async () => {
    const source = await sharp({
      create: { width: 64, height: 48, channels: 3, background: '#8b5a3c' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const result = await sanitizeDemoImage(source, {
      declaredContentType: 'image/jpeg',
      maxBytes: 3 * 1024 * 1024,
      maxPixels: 12_000_000,
    });
    const displayMetadata = await sharp(result.display.buffer).metadata();

    expect(displayMetadata.format).toBe('webp');
    expect(displayMetadata.exif).toBeUndefined();
    expect(displayMetadata.icc).toBeUndefined();
    expect(result.display.width).toBe(48);
    expect(result.display.height).toBe(64);
    expect(result.thumbnail.buffer.length).toBeGreaterThan(0);
    expect(result.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects malformed input and declared-type mismatches', async () => {
    await expect(
      sanitizeDemoImage(Buffer.from('not an image'), {
        declaredContentType: 'image/jpeg',
        maxBytes: 3 * 1024 * 1024,
        maxPixels: 12_000_000,
      }),
    ).rejects.toMatchObject({ failureCode: 'demo_image_decode_failed' });

    const png = await sharp({
      create: { width: 16, height: 16, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await expect(
      sanitizeDemoImage(png, {
        declaredContentType: 'image/jpeg',
        maxBytes: 3 * 1024 * 1024,
        maxPixels: 12_000_000,
      }),
    ).rejects.toMatchObject({
      failureCode: 'demo_image_invalid_dimensions',
    });
  });

  it('rejects encoded-size and decoded-pixel limit violations', async () => {
    await expect(
      sanitizeDemoImage(Buffer.alloc(101), {
        declaredContentType: 'image/jpeg',
        maxBytes: 100,
        maxPixels: 12_000_000,
      }),
    ).rejects.toMatchObject({ failureCode: 'demo_image_too_large' });

    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    await expect(
      sanitizeDemoImage(png, {
        declaredContentType: 'image/png',
        maxBytes: 3 * 1024 * 1024,
        maxPixels: 100,
      }),
    ).rejects.toMatchObject({ failureCode: 'demo_image_decode_failed' });
  });
});

describe('demo image processor approval isolation', () => {
  beforeEach(() => s3Send.mockReset());

  it('approves only the sanitized derivatives and removes the private original', async () => {
    const source = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#445c52' },
    })
      .png()
      .toBuffer();
    s3Send.mockImplementation((command: unknown) => {
      if (command instanceof GetObjectCommand) {
        return Promise.resolve({
          Body: { transformToByteArray: () => Promise.resolve(new Uint8Array(source)) },
        });
      }
      return Promise.resolve({});
    });

    const managerQuery = vi.fn((sql: string) =>
      Promise.resolve(sql.includes('RETURNING id') ? [{ id: 'asset-1' }] : []),
    );
    const dataSource = {
      query: vi.fn().mockResolvedValue([
        {
          id: 'asset-1',
          storage_key: 'quarantine/demo-7day/asset-1',
          declared_content_type: 'image/png',
          detected_content_type: 'image/png',
          byte_size: String(source.length),
          media_kind: 'image',
        },
      ]),
      transaction: (work: (manager: { query: typeof managerQuery }) => Promise<unknown>) =>
        work({ query: managerQuery }),
    } as unknown as DataSource;

    const service = new DemoImageProcessorService(dataSource, demoConfig());
    await expect(service.process('asset-1')).resolves.toEqual({
      mediaAssetId: 'asset-1',
      status: 'approved',
      processingRequired: false,
    });

    const putKeys: Array<string | undefined> = [];
    for (const call of s3Send.mock.calls) {
      const command: unknown = call[0];
      if (command instanceof PutObjectCommand) putKeys.push(command.input.Key);
    }
    expect(putKeys).toEqual([
      'processed/demo-7day/asset-1/display.webp',
      'processed/demo-7day/asset-1/thumbnail.webp',
    ]);
    expect(
      s3Send.mock.calls.some(
        ([command]) =>
          command instanceof DeleteObjectCommand &&
          command.input.Key === 'quarantine/demo-7day/asset-1',
      ),
    ).toBe(true);
    expect(
      managerQuery.mock.calls.some(([sql]) =>
        String(sql).includes("processing_status = 'approved'"),
      ),
    ).toBe(true);
  });

  it('rejects malformed media instead of approving or publishing it', async () => {
    const source = Buffer.from('not an image');
    s3Send.mockImplementation((command: unknown) =>
      command instanceof GetObjectCommand
        ? Promise.resolve({
            Body: { transformToByteArray: () => Promise.resolve(new Uint8Array(source)) },
          })
        : Promise.resolve({}),
    );
    const query = vi
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'asset-2',
          storage_key: 'quarantine/demo-7day/asset-2',
          declared_content_type: 'image/jpeg',
          detected_content_type: 'image/jpeg',
          byte_size: String(source.length),
          media_kind: 'image',
        },
      ])
      .mockResolvedValue([]);
    const dataSource = { query } as unknown as DataSource;

    const service = new DemoImageProcessorService(dataSource, demoConfig());
    await expect(service.process('asset-2')).rejects.toBeInstanceOf(BadRequestException);
    expect(
      query.mock.calls.some(([sql]) => String(sql).includes("processing_status = 'rejected'")),
    ).toBe(true);
    expect(
      query.mock.calls.some(([sql]) => String(sql).includes("processing_status = 'approved'")),
    ).toBe(false);
  });
});

function demoConfig(): ConfigService<Environment, true> {
  const values: Partial<Environment> = {
    DEPLOYMENT_PROFILE: 'demo',
    MEDIA_DEMO_IMAGE_PROCESSING_ENABLED: true,
    MEDIA_DEMO_STORAGE_PREFIX: 'demo-7day',
    MEDIA_DEMO_MAX_IMAGE_BYTES: 3 * 1024 * 1024,
    MEDIA_DEMO_MAX_IMAGE_PIXELS: 12_000_000,
    MEDIA_STORAGE_BUCKET: 'demo-private-bucket',
    MEDIA_STORAGE_ENDPOINT: 'https://s3.example.test',
    MEDIA_STORAGE_REGION: 'us-east-005',
    MEDIA_STORAGE_KEY_ID: 'demo-key-id',
    MEDIA_STORAGE_APPLICATION_KEY: 'demo-application-key',
  };
  return { get: (key: keyof Environment) => values[key] } as ConfigService<Environment, true>;
}
