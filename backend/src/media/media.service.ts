import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { Environment } from '../config/environment';
import { JobQueueService } from '../jobs/job-queue.service';
import { AttachMediaDto, CreateMediaUploadDto } from './dto/create-media-upload.dto';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

interface MediaRow {
  id: string;
  storage_key: string;
  derivative_storage_key: string | null;
  declared_content_type: string;
  detected_content_type: string | null;
  byte_size: string;
  processing_status: string;
  owner_user_id: string;
}

@Injectable()
export class MediaService {
  private readonly client?: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Environment, true>,
    private readonly jobs: JobQueueService,
  ) {
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
  }

  async initiate(actorUserId: string, input: CreateMediaUploadDto) {
    const client = this.requireStorage();
    const maximum = input.contentType === 'application/pdf' ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
    if (input.byteSize > maximum)
      throw new BadRequestException('The file exceeds the allowed size.');
    const id = randomUUID();
    const mediaKind = input.contentType === 'application/pdf' ? 'document' : 'image';
    const storageKey = `quarantine/${id}`;
    await this.dataSource.query(
      `INSERT INTO media_assets (
        id, storage_key, original_filename, declared_content_type, byte_size, media_kind,
        rights_statement, licence, credit, owner_user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        storageKey,
        sanitizeFilename(input.filename),
        input.contentType,
        input.byteSize,
        mediaKind,
        input.rightsStatement.trim(),
        input.licence?.trim() || null,
        input.credit?.trim() || null,
        actorUserId,
      ],
    );
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: input.contentType,
        ContentLength: input.byteSize,
        Metadata: { 'asset-id': id },
      }),
      { expiresIn: 300 },
    );
    return {
      mediaAssetId: id,
      uploadUrl,
      method: 'PUT',
      expiresInSeconds: 300,
      requiredHeaders: { 'content-type': input.contentType },
    };
  }

  async confirm(actorUserId: string, mediaAssetId: string) {
    const client = this.requireStorage();
    const media = await this.getOwned(mediaAssetId, actorUserId);
    if (media.processing_status !== 'pending') {
      throw new BadRequestException('Only pending uploads can be confirmed.');
    }
    const head = await client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: media.storage_key }),
    );
    if (Number(head.ContentLength) !== Number(media.byte_size)) {
      await this.reject(mediaAssetId, media.storage_key, 'size_mismatch');
      throw new BadRequestException('Uploaded file size does not match the upload request.');
    }
    if (
      head.ContentType !== media.declared_content_type ||
      head.Metadata?.['asset-id'] !== media.id
    ) {
      await this.reject(mediaAssetId, media.storage_key, 'metadata_mismatch');
      throw new BadRequestException('Uploaded file metadata does not match the upload request.');
    }
    const sample = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: media.storage_key, Range: 'bytes=0-15' }),
    );
    const bytes = sample.Body ? await sample.Body.transformToByteArray() : new Uint8Array();
    const detected = detectContentType(bytes);
    if (detected !== media.declared_content_type) {
      await this.reject(mediaAssetId, media.storage_key, 'magic_byte_mismatch');
      throw new BadRequestException('The file contents do not match the declared type.');
    }
    await this.dataSource.query(
      `UPDATE media_assets SET detected_content_type = $2, processing_status = 'quarantined',
        updated_at = now() WHERE id = $1`,
      [mediaAssetId, detected],
    );
    const jobId = await this.jobs.enqueueMedia(mediaAssetId);
    return { mediaAssetId, status: 'quarantined', processingRequired: true, jobId };
  }

  async attachToRecord(actorUserId: string, recordId: string, input: AttachMediaDto) {
    const media = await this.getOwned(input.mediaAssetId, actorUserId);
    if (media.processing_status === 'rejected' || media.processing_status === 'archived') {
      throw new BadRequestException('Rejected or archived media cannot be attached.');
    }
    await this.dataSource.transaction(async (manager) => {
      const records = (await manager.query(
        `SELECT status FROM scientific_records WHERE id = $1 FOR UPDATE`,
        [recordId],
      )) as unknown as Array<{ status: string }>;
      if (!records[0]) throw new NotFoundException('Scientific record not found.');
      if (records[0].status === 'published' || records[0].status === 'archived') {
        throw new ConflictException('This record cannot be edited in its current state.');
      }
      await manager.query(
        `INSERT INTO record_media (record_id, media_asset_id, purpose)
       VALUES ($1,$2,$3) ON CONFLICT (record_id, media_asset_id)
       DO UPDATE SET purpose = EXCLUDED.purpose`,
        [recordId, media.id, input.purpose.trim()],
      );
      await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
        recordId,
      ]);
      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, 'scientific-record.media-attached', 'scientific-record', $2, $3::jsonb)`,
        [actorUserId, recordId, JSON.stringify({ mediaAssetId: media.id })],
      );
    });
    return { recordId, mediaAssetId: media.id, purpose: input.purpose };
  }

  async listRecordAttachments(recordId: string) {
    const records = (await this.dataSource.query(
      `SELECT id FROM scientific_records WHERE id = $1`,
      [recordId],
    )) as unknown as Array<{ id: string }>;
    if (!records[0]) throw new NotFoundException('Scientific record not found.');
    const rows = (await this.dataSource.query(
      `SELECT m.id AS "mediaAssetId", rm.purpose, rm.position,
         m.media_kind AS "mediaKind", m.processing_status AS "processingStatus",
         m.original_filename AS "filename", m.rights_statement AS "rightsStatement",
         m.licence, m.credit
       FROM record_media rm JOIN media_assets m ON m.id = rm.media_asset_id
       WHERE rm.record_id = $1 ORDER BY rm.position, m.created_at, m.id`,
      [recordId],
    )) as unknown as Record<string, unknown>[];
    return { items: rows };
  }

  async viewerUrl(mediaAssetId: string) {
    const client = this.requireStorage();
    const rows = (await this.dataSource.query(
      `SELECT id, storage_key, derivative_storage_key, declared_content_type,
        detected_content_type, byte_size, processing_status, owner_user_id
       FROM media_assets WHERE id = $1`,
      [mediaAssetId],
    )) as unknown as MediaRow[];
    const media = rows[0];
    if (!media || media.processing_status !== 'approved') {
      throw new NotFoundException('Approved online-view media not found.');
    }
    const derivatives = (await this.dataSource.query(
      `SELECT derivative_kind, page_number, storage_key, content_type, width, height
       FROM media_derivatives WHERE media_asset_id = $1
       ORDER BY CASE derivative_kind WHEN 'display' THEN 0 WHEN 'thumbnail' THEN 1 ELSE 2 END,
         page_number NULLS FIRST`,
      [mediaAssetId],
    )) as unknown as Array<{
      derivative_kind: string;
      page_number: number | null;
      storage_key: string;
      content_type: string;
      width: number;
      height: number;
    }>;
    if (!derivatives.length) throw new NotFoundException('Approved derivatives not found.');
    const items = await Promise.all(
      derivatives.map(async (derivative) => ({
        kind: derivative.derivative_kind,
        pageNumber: derivative.page_number,
        width: derivative.width,
        height: derivative.height,
        url: await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: derivative.storage_key,
            ResponseContentDisposition: 'inline',
            ResponseCacheControl: 'private, no-store, max-age=0',
            ResponseContentType: derivative.content_type,
          }),
          { expiresIn: 120 },
        ),
      })),
    );
    return { items, expiresInSeconds: 120, disposition: 'inline' };
  }

  private requireStorage(): S3Client {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException('Private media storage is not configured.');
    }
    return this.client;
  }

  private async getOwned(id: string, userId: string): Promise<MediaRow> {
    const rows = (await this.dataSource.query(
      `SELECT id, storage_key, derivative_storage_key, declared_content_type,
        detected_content_type, byte_size, processing_status, owner_user_id
       FROM media_assets WHERE id = $1 AND owner_user_id = $2`,
      [id, userId],
    )) as unknown as MediaRow[];
    if (!rows[0]) throw new NotFoundException('Media asset not found.');
    return rows[0];
  }

  private async reject(id: string, storageKey: string, code: string) {
    const client = this.requireStorage();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }));
    await this.dataSource.query(
      `UPDATE media_assets SET processing_status = 'rejected', failure_code = $2,
        updated_at = now() WHERE id = $1`,
      [id, code],
    );
  }
}

export function detectContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  )
    return 'image/png';
  if (bytes.length >= 12 && text(bytes, 0, 4) === 'RIFF' && text(bytes, 8, 12) === 'WEBP')
    return 'image/webp';
  if (bytes.length >= 5 && text(bytes, 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

function text(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

function sanitizeFilename(value: string): string {
  const cleaned = [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return character === '/' || character === '\\' || code < 32 || code === 127 ? '_' : character;
    })
    .join('')
    .trim();
  return cleaned.slice(0, 300) || 'upload';
}
