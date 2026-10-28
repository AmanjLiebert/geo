import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { DataSource } from 'typeorm';
import { Environment } from '../config/environment';

const DEMO_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface DemoMediaRow {
  id: string;
  storage_key: string;
  declared_content_type: string;
  detected_content_type: string | null;
  byte_size: string;
  media_kind: string;
}

export interface SanitizedDemoImage {
  sourceSha256: string;
  display: DemoDerivative;
  thumbnail: DemoDerivative;
}

interface DemoDerivative {
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
}

export class DemoImageValidationError extends Error {
  constructor(
    readonly failureCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'DemoImageValidationError';
  }
}

@Injectable()
export class DemoImageProcessorService {
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly enabled: boolean;
  private readonly prefix: string;
  private readonly maxBytes: number;
  private readonly maxPixels: number;
  private processingTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Environment, true>,
  ) {
    this.enabled =
      this.config.get('DEPLOYMENT_PROFILE', { infer: true }) === 'demo' &&
      this.config.get('MEDIA_DEMO_IMAGE_PROCESSING_ENABLED', { infer: true });
    this.prefix = this.config.get('MEDIA_DEMO_STORAGE_PREFIX', { infer: true });
    this.maxBytes = this.config.get('MEDIA_DEMO_MAX_IMAGE_BYTES', { infer: true });
    this.maxPixels = this.config.get('MEDIA_DEMO_MAX_IMAGE_PIXELS', { infer: true });
    this.bucket = this.config.get('MEDIA_STORAGE_BUCKET', { infer: true });

    const endpoint = this.config.get('MEDIA_STORAGE_ENDPOINT', { infer: true });
    const keyId = this.config.get('MEDIA_STORAGE_KEY_ID', { infer: true });
    const applicationKey = this.config.get('MEDIA_STORAGE_APPLICATION_KEY', { infer: true });
    if (this.bucket && endpoint && keyId && applicationKey) {
      this.client = new S3Client({
        endpoint,
        region: this.config.get('MEDIA_STORAGE_REGION', { infer: true }),
        forcePathStyle: true,
        credentials: { accessKeyId: keyId, secretAccessKey: applicationKey },
      });
    }

    if (this.enabled) {
      sharp.cache({ memory: 16, files: 0, items: 8 });
      sharp.concurrency(1);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  storageKey(mediaAssetId: string): string {
    return `quarantine/${this.prefix}/${mediaAssetId}`;
  }

  maxImageBytes(): number {
    return this.maxBytes;
  }

  async process(mediaAssetId: string): Promise<{
    mediaAssetId: string;
    status: 'approved';
    processingRequired: false;
  }> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Demo image processing is not enabled.');
    }
    const processing = this.processingTail.then(() => this.processOne(mediaAssetId));
    this.processingTail = processing.then(
      () => undefined,
      () => undefined,
    );
    return processing;
  }

  private async processOne(mediaAssetId: string): Promise<{
    mediaAssetId: string;
    status: 'approved';
    processingRequired: false;
  }> {
    const client = this.requireStorage();
    const rows = await this.dataSource.query<DemoMediaRow[]>(
      `UPDATE media_assets
       SET processing_status = 'processing', processing_attempts = processing_attempts + 1,
           processing_started_at = now(), failure_code = NULL, updated_at = now()
       WHERE id = $1 AND processing_status = 'quarantined' AND media_kind = 'image'
         AND storage_key LIKE $2
       RETURNING id, storage_key, declared_content_type, detected_content_type,
                 byte_size, media_kind`,
      [mediaAssetId, `quarantine/${this.prefix}/%`],
    );
    const media = rows[0];
    if (!media) {
      throw new BadRequestException('The demo image is not available for processing.');
    }

    const uploadedKeys: string[] = [];
    try {
      if (
        media.media_kind !== 'image' ||
        !DEMO_IMAGE_TYPES.has(media.declared_content_type) ||
        media.detected_content_type !== media.declared_content_type ||
        Number(media.byte_size) > this.maxBytes
      ) {
        throw new DemoImageValidationError(
          'demo_image_policy_rejected',
          'Choose a JPEG, PNG, or WebP image smaller than 3 MB.',
        );
      }

      const object = await client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: media.storage_key }),
      );
      const source = Buffer.from(
        object.Body ? await object.Body.transformToByteArray() : new Uint8Array(),
      );
      if (source.length !== Number(media.byte_size)) {
        throw new DemoImageValidationError(
          'demo_image_size_mismatch',
          'The uploaded image could not be validated.',
        );
      }

      const sanitized = await sanitizeDemoImage(source, {
        declaredContentType: media.declared_content_type,
        maxBytes: this.maxBytes,
        maxPixels: this.maxPixels,
      });
      const displayKey = `processed/${this.prefix}/${media.id}/display.webp`;
      const thumbnailKey = `processed/${this.prefix}/${media.id}/thumbnail.webp`;

      for (const derivative of [
        { key: displayKey, kind: 'display', value: sanitized.display },
        { key: thumbnailKey, kind: 'thumbnail', value: sanitized.thumbnail },
      ]) {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: derivative.key,
            Body: derivative.value.buffer,
            ContentType: 'image/webp',
            CacheControl: 'private, no-store, max-age=0',
            Metadata: {
              'asset-id': media.id,
              'derivative-kind': derivative.kind,
              'processing-profile': 'demo-sharp-v1',
            },
          }),
        );
        uploadedKeys.push(derivative.key);
      }

      // The untrusted original is private throughout and is removed before approval.
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: media.storage_key }));

      await this.dataSource.transaction(async (manager) => {
        await manager.query(`DELETE FROM media_derivatives WHERE media_asset_id = $1`, [media.id]);
        for (const derivative of [
          { key: displayKey, kind: 'display', value: sanitized.display },
          { key: thumbnailKey, kind: 'thumbnail', value: sanitized.thumbnail },
        ]) {
          await manager.query(
            `INSERT INTO media_derivatives (
               id, media_asset_id, derivative_kind, page_number, storage_key, content_type,
               byte_size, width, height, sha256
             ) VALUES ($1,$2,$3,NULL,$4,'image/webp',$5,$6,$7,$8)`,
            [
              randomUUID(),
              media.id,
              derivative.kind,
              derivative.key,
              derivative.value.buffer.length,
              derivative.value.width,
              derivative.value.height,
              derivative.value.sha256,
            ],
          );
        }
        const approved = await manager.query<Array<{ id: string }>>(
          `UPDATE media_assets
           SET processing_status = 'approved', sha256 = $2, derivative_storage_key = $3,
               scanner_result = 'demo-sharp-sanitized', failure_code = NULL,
               processed_at = now(), updated_at = now()
           WHERE id = $1 AND processing_status = 'processing'
           RETURNING id`,
          [media.id, sanitized.sourceSha256, displayKey],
        );
        if (!approved[0]) throw new Error('The demo media approval state changed unexpectedly.');
      });

      return { mediaAssetId: media.id, status: 'approved', processingRequired: false };
    } catch (error) {
      await this.deleteObjects(client, uploadedKeys);
      if (error instanceof DemoImageValidationError) {
        await this.deleteObjects(client, [media.storage_key]);
        await this.dataSource.query(
          `UPDATE media_assets
           SET processing_status = 'rejected', scanner_result = 'demo-validation-rejected',
               failure_code = $2, processed_at = now(), updated_at = now()
           WHERE id = $1`,
          [media.id, error.failureCode],
        );
        throw new BadRequestException(error.message);
      }
      await this.dataSource.query(
        `UPDATE media_assets SET processing_status = 'failed', failure_code = 'demo_processing_failed',
           updated_at = now() WHERE id = $1`,
        [media.id],
      );
      throw new ServiceUnavailableException('The image could not be processed safely.');
    }
  }

  private requireStorage(): S3Client {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException('Private media storage is not configured.');
    }
    return this.client;
  }

  private async deleteObjects(client: S3Client, keys: string[]): Promise<void> {
    await Promise.allSettled(
      keys.map((key) => client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))),
    );
  }
}

export async function sanitizeDemoImage(
  source: Buffer,
  options: { declaredContentType: string; maxBytes: number; maxPixels: number },
): Promise<SanitizedDemoImage> {
  if (source.length < 1 || source.length > options.maxBytes) {
    throw new DemoImageValidationError(
      'demo_image_too_large',
      'Choose an image smaller than 3 MB.',
    );
  }
  if (!DEMO_IMAGE_TYPES.has(options.declaredContentType)) {
    throw new DemoImageValidationError(
      'demo_image_unsupported_type',
      'Choose a JPEG, PNG, or WebP image.',
    );
  }

  try {
    const input = sharp(source, {
      failOn: 'error',
      limitInputPixels: options.maxPixels,
      sequentialRead: true,
    });
    const metadata = await input.metadata();
    const expectedFormat: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    if (
      metadata.format !== expectedFormat[options.declaredContentType] ||
      !metadata.width ||
      !metadata.height ||
      metadata.width * metadata.height > options.maxPixels ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new DemoImageValidationError(
        'demo_image_invalid_dimensions',
        'The image format or dimensions are not supported.',
      );
    }

    const displayResult = await input
      .rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 3 })
      .toBuffer({ resolveWithObject: true });
    const thumbnailResult = await sharp(displayResult.data, {
      failOn: 'error',
      limitInputPixels: options.maxPixels,
      sequentialRead: true,
    })
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, effort: 2 })
      .toBuffer({ resolveWithObject: true });

    return {
      sourceSha256: sha256(source),
      display: derivative(displayResult.data, displayResult.info.width, displayResult.info.height),
      thumbnail: derivative(
        thumbnailResult.data,
        thumbnailResult.info.width,
        thumbnailResult.info.height,
      ),
    };
  } catch (error) {
    if (error instanceof DemoImageValidationError) throw error;
    throw new DemoImageValidationError(
      'demo_image_decode_failed',
      'The image is malformed or exceeds the safe pixel limit.',
    );
  }
}

function derivative(buffer: Buffer, width: number, height: number): DemoDerivative {
  return { buffer, width, height, sha256: sha256(buffer) };
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}
