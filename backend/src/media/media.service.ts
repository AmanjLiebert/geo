import {
  BadRequestException,
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
import { Readable } from 'node:stream';
import { DataSource } from 'typeorm';
import { Environment } from '../config/environment';
import { JobQueueService } from '../jobs/job-queue.service';
import { assertRecordEditable } from '../scientific-content/record-invariants';
import {
  AttachMediaDto,
  CreateMediaUploadDto,
  UpdateRecordAttachmentDto,
} from './dto/create-media-upload.dto';

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
  media_kind: 'image' | 'document' | 'video';
}

@Injectable()
export class MediaService {
  private readonly client?: S3Client;
  private readonly bucket: string;
  private readonly maxVideoBytes: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Environment, true>,
    private readonly jobs: JobQueueService,
  ) {
    this.bucket = this.config.get('MEDIA_STORAGE_BUCKET', { infer: true });
    this.maxVideoBytes = this.config.get('MEDIA_MAX_VIDEO_BYTES', { infer: true }) || 52_428_800;
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
    if (!input.filename.trim() || !input.rightsStatement.trim()) {
      throw new BadRequestException('Filename and rights statement are required.');
    }
    let maximum = MAX_IMAGE_BYTES;
    let mediaKind: 'image' | 'document' | 'video' = 'image';

    if (input.contentType === 'application/pdf') {
      maximum = MAX_DOCUMENT_BYTES;
      mediaKind = 'document';
    } else if (input.contentType.startsWith('video/')) {
      maximum = this.maxVideoBytes;
      mediaKind = 'video';
    }

    if (input.byteSize > maximum) {
      throw new BadRequestException('The file exceeds the allowed size.');
    }

    const id = randomUUID();
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
      new GetObjectCommand({ Bucket: this.bucket, Key: media.storage_key, Range: 'bytes=0-127' }),
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

    const isPrimary = Boolean(input.isPrimary);
    if (isPrimary && media.media_kind !== 'image') {
      throw new BadRequestException(
        'Only image attachments can be designated as the primary image.',
      );
    }
    if (media.media_kind !== 'image' && input.altText?.trim()) {
      throw new BadRequestException('Alt text is only supported for image attachments.');
    }

    const caption = input.caption?.trim() || null;
    const description = input.description?.trim() || null;
    const altText = input.altText?.trim() || null;
    const purpose = input.purpose.trim();
    if (!purpose) throw new BadRequestException('Purpose is required.');

    await this.dataSource.transaction(async (manager) => {
      await assertRecordEditable(manager, recordId, { lock: true });

      if (isPrimary) {
        await manager.query(`UPDATE record_media SET is_primary = false WHERE record_id = $1`, [
          recordId,
        ]);
      }

      const positionParam = input.position ?? null;

      await manager.query(
        `INSERT INTO record_media (
          record_id, media_asset_id, purpose, caption, description, alt_text, position, is_primary
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          COALESCE($7, (SELECT COALESCE(MAX(rm.position), -1) + 1 FROM record_media rm WHERE rm.record_id = $1)),
          $8
        )
        ON CONFLICT (record_id, media_asset_id)
        DO UPDATE SET
          purpose = EXCLUDED.purpose,
          caption = EXCLUDED.caption,
          description = EXCLUDED.description,
          alt_text = EXCLUDED.alt_text,
          position = EXCLUDED.position,
          is_primary = EXCLUDED.is_primary`,
        [recordId, media.id, purpose, caption, description, altText, positionParam, isPrimary],
      );

      await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
        recordId,
      ]);

      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, 'scientific-record.media-attached', 'scientific-record', $2, $3::jsonb)`,
        [
          actorUserId,
          recordId,
          JSON.stringify({
            mediaAssetId: media.id,
            isPrimary,
            purpose,
            position: positionParam,
          }),
        ],
      );
    });

    return {
      recordId,
      mediaAssetId: media.id,
      purpose,
      caption,
      description,
      altText,
      position: input.position,
      isPrimary,
    };
  }

  async updateAttachment(
    actorUserId: string,
    recordId: string,
    mediaAssetId: string,
    input: UpdateRecordAttachmentDto,
  ) {
    let updatedAttachment: Record<string, unknown> | null = null;

    await this.dataSource.transaction(async (manager) => {
      await assertRecordEditable(manager, recordId, { lock: true });

      const existing = await manager.query<
        Array<{
          record_id: string;
          media_asset_id: string;
          purpose: string;
          caption: string | null;
          description: string | null;
          alt_text: string | null;
          position: number;
          is_primary: boolean;
          media_kind: string;
        }>
      >(
        `SELECT rm.record_id, rm.media_asset_id, rm.purpose, rm.caption, rm.description,
                rm.alt_text, rm.position, rm.is_primary, m.media_kind
         FROM record_media rm
         JOIN media_assets m ON m.id = rm.media_asset_id
         WHERE rm.record_id = $1 AND rm.media_asset_id = $2 AND m.owner_user_id = $3
         FOR UPDATE`,
        [recordId, mediaAssetId, actorUserId],
      );

      if (!existing[0]) {
        throw new NotFoundException('Attachment not found on this record.');
      }
      const current = existing[0];

      if (current.media_kind !== 'image' && input.altText?.trim()) {
        throw new BadRequestException('Alt text is only supported for image attachments.');
      }

      let isPrimary = current.is_primary;
      if (input.isPrimary !== undefined) {
        if (input.isPrimary && current.media_kind !== 'image') {
          throw new BadRequestException(
            'Only image attachments can be designated as the primary image.',
          );
        }
        isPrimary = input.isPrimary;
        if (isPrimary && !current.is_primary) {
          await manager.query(
            `UPDATE record_media SET is_primary = false WHERE record_id = $1 AND media_asset_id <> $2`,
            [recordId, mediaAssetId],
          );
        }
      }

      const purpose = input.purpose !== undefined ? input.purpose.trim() : current.purpose;
      if (!purpose) throw new BadRequestException('Purpose is required.');
      const caption =
        input.caption !== undefined
          ? input.caption === null || input.caption === ''
            ? null
            : input.caption.trim()
          : current.caption;
      const description =
        input.description !== undefined
          ? input.description === null || input.description === ''
            ? null
            : input.description.trim()
          : current.description;
      const altText =
        input.altText !== undefined
          ? input.altText === null || input.altText === ''
            ? null
            : input.altText.trim()
          : current.alt_text;
      const position = input.position !== undefined ? input.position : current.position;

      await manager.query(
        `UPDATE record_media
         SET purpose = $3,
             caption = $4,
             description = $5,
             alt_text = $6,
             position = $7,
             is_primary = $8
         WHERE record_id = $1 AND media_asset_id = $2`,
        [recordId, mediaAssetId, purpose, caption, description, altText, position, isPrimary],
      );

      await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
        recordId,
      ]);

      const auditAction =
        isPrimary !== current.is_primary && isPrimary
          ? 'scientific-record.primary-media-changed'
          : 'scientific-record.media-updated';

      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, $2, 'scientific-record', $3, $4::jsonb)`,
        [
          actorUserId,
          auditAction,
          recordId,
          JSON.stringify({
            mediaAssetId,
            isPrimary,
            purpose,
            position,
          }),
        ],
      );

      updatedAttachment = {
        recordId,
        mediaAssetId,
        purpose,
        caption,
        description,
        altText,
        position,
        isPrimary,
      };
    });

    return updatedAttachment;
  }

  async setPrimaryAttachment(actorUserId: string, recordId: string, mediaAssetId: string) {
    return this.updateAttachment(actorUserId, recordId, mediaAssetId, { isPrimary: true });
  }

  async reorderAttachments(actorUserId: string, recordId: string, mediaAssetIds: string[]) {
    const uniqueIds = new Set(mediaAssetIds);
    if (uniqueIds.size !== mediaAssetIds.length) {
      throw new BadRequestException('mediaAssetIds list must not contain duplicates.');
    }

    await this.dataSource.transaction(async (manager) => {
      await assertRecordEditable(manager, recordId, { lock: true });

      const existing = await manager.query<
        Array<{ media_asset_id: string; owner_user_id: string }>
      >(
        `SELECT rm.media_asset_id, m.owner_user_id
         FROM record_media rm
         JOIN media_assets m ON m.id = rm.media_asset_id
         WHERE rm.record_id = $1
         FOR UPDATE OF rm`,
        [recordId],
      );

      const existingIds = new Set(existing.map((r) => r.media_asset_id));
      if (
        existing.length !== mediaAssetIds.length ||
        existing.some((attachment) => attachment.owner_user_id !== actorUserId)
      ) {
        throw new BadRequestException('The complete owned attachment order is required.');
      }
      for (const id of mediaAssetIds) {
        if (!existingIds.has(id)) {
          throw new BadRequestException('The attachment order contains an unavailable item.');
        }
      }

      for (let index = 0; index < mediaAssetIds.length; index++) {
        await manager.query(
          `UPDATE record_media SET position = $3 WHERE record_id = $1 AND media_asset_id = $2`,
          [recordId, mediaAssetIds[index], index],
        );
      }

      await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
        recordId,
      ]);

      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, 'scientific-record.media-reordered', 'scientific-record', $2, $3::jsonb)`,
        [actorUserId, recordId, JSON.stringify({ order: mediaAssetIds })],
      );
    });

    return this.listRecordAttachments(recordId);
  }

  async detachFromRecord(actorUserId: string, recordId: string, mediaAssetId: string) {
    await this.dataSource.transaction(async (manager) => {
      await assertRecordEditable(manager, recordId, { lock: true });

      const existing = await manager.query<Array<{ is_primary: boolean }>>(
        `SELECT rm.is_primary
         FROM record_media rm
         JOIN media_assets m ON m.id = rm.media_asset_id
         WHERE rm.record_id = $1 AND rm.media_asset_id = $2 AND m.owner_user_id = $3
         FOR UPDATE OF rm`,
        [recordId, mediaAssetId, actorUserId],
      );

      if (!existing[0]) {
        throw new NotFoundException('Attachment not found on this record.');
      }

      await manager.query(`DELETE FROM record_media WHERE record_id = $1 AND media_asset_id = $2`, [
        recordId,
        mediaAssetId,
      ]);

      await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
        recordId,
      ]);

      await manager.query(
        `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
         VALUES ($1, 'scientific-record.media-detached', 'scientific-record', $2, $3::jsonb)`,
        [
          actorUserId,
          recordId,
          JSON.stringify({ mediaAssetId, wasPrimary: existing[0].is_primary }),
        ],
      );
    });

    return { success: true, recordId, mediaAssetId };
  }

  async listRecordAttachments(recordId: string) {
    const records = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM scientific_records WHERE id = $1`,
      [recordId],
    );
    if (!records[0]) throw new NotFoundException('Scientific record not found.');

    const rows = (await this.dataSource.query(
      `SELECT m.id AS "mediaAssetId", rm.purpose, rm.position,
         rm.caption, rm.description, rm.alt_text AS "altText", rm.is_primary AS "isPrimary",
         m.media_kind AS "mediaKind", m.processing_status AS "processingStatus",
         m.original_filename AS "filename", m.rights_statement AS "rightsStatement",
         m.licence, m.credit
       FROM record_media rm
       JOIN media_assets m ON m.id = rm.media_asset_id
       WHERE rm.record_id = $1
       ORDER BY rm.position ASC, rm.is_primary DESC, m.created_at ASC, m.id ASC`,
      [recordId],
    )) as unknown as Record<string, unknown>[];

    return { items: rows };
  }

  async viewerUrl(mediaAssetId: string) {
    const client = this.requireStorage();
    const rows = (await this.dataSource.query(
      `SELECT id, storage_key, derivative_storage_key, declared_content_type,
        detected_content_type, byte_size, processing_status, owner_user_id, media_kind
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

    if (!derivatives.length && media.media_kind !== 'video') {
      throw new NotFoundException('Approved derivatives not found.');
    }

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

    if (media.media_kind === 'video') {
      const playback = approvedVideoPlayback(media);
      if (!playback) {
        throw new NotFoundException('Approved video playback is not available.');
      }
      items.push({
        kind: 'playback',
        pageNumber: null,
        width: 0,
        height: 0,
        url: await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: this.bucket,
            Key: playback.storageKey,
            ResponseContentDisposition: 'inline',
            ResponseCacheControl: 'private, no-store, max-age=0',
            ResponseContentType: playback.contentType,
          }),
          { expiresIn: 120 },
        ),
      });
    }

    return { items, expiresInSeconds: 120, disposition: 'inline' };
  }

  async publicInlineImage(mediaAssetId: string) {
    const client = this.requireStorage();
    const media = await this.dataSource.query<
      Array<{ id: string; media_kind: string; processing_status: string }>
    >(
      `SELECT id, media_kind, processing_status
       FROM media_assets
       WHERE id = $1`,
      [mediaAssetId],
    );
    if (!media[0] || media[0].media_kind !== 'image' || media[0].processing_status !== 'approved') {
      throw new NotFoundException('Approved public image not found.');
    }

    const derivatives = await this.dataSource.query<
      Array<{ storage_key: string; content_type: string }>
    >(
      `SELECT storage_key, content_type
       FROM media_derivatives
       WHERE media_asset_id = $1
         AND derivative_kind IN ('display', 'thumbnail')
       ORDER BY CASE derivative_kind WHEN 'display' THEN 0 ELSE 1 END,
         page_number NULLS FIRST
       LIMIT 1`,
      [mediaAssetId],
    );
    const derivative = derivatives[0];
    if (!derivative) {
      throw new NotFoundException('Approved public image not found.');
    }

    const object = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: derivative.storage_key }),
    );
    if (!(object.Body instanceof Readable)) {
      throw new ServiceUnavailableException('Public image is temporarily unavailable.');
    }

    return {
      stream: object.Body,
      contentType: object.ContentType || derivative.content_type,
      contentLength: object.ContentLength,
    };
  }

  async getRecordMediaPublicationReadiness(recordId: string) {
    const records = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM scientific_records WHERE id = $1`,
      [recordId],
    );
    if (!records[0]) throw new NotFoundException('Scientific record not found.');

    const attachments = await this.dataSource.query<
      Array<{
        is_primary: boolean;
        alt_text: string | null;
        processing_status: string;
        rights_statement: string;
        media_kind: string;
      }>
    >(
      `SELECT rm.is_primary, rm.alt_text, m.processing_status, m.rights_statement, m.media_kind
       FROM record_media rm
       JOIN media_assets m ON m.id = rm.media_asset_id
       WHERE rm.record_id = $1`,
      [recordId],
    );

    const issues: Array<{ code: string; message: string }> = [];
    const primary = attachments.find((a) => a.is_primary);

    const hasPrimaryImage = Boolean(primary && primary.media_kind === 'image');
    if (!hasPrimaryImage) {
      issues.push({ code: 'primary_image_required', message: 'A primary image is required.' });
    }

    const isPrimaryImageApproved = Boolean(primary && primary.processing_status === 'approved');
    if (hasPrimaryImage && !isPrimaryImageApproved) {
      issues.push({
        code: 'primary_image_unapproved',
        message: 'The primary image must be approved.',
      });
    }

    const hasRightsStatement = Boolean(
      primary && primary.rights_statement && primary.rights_statement.trim().length > 0,
    );
    if (hasPrimaryImage && !hasRightsStatement) {
      issues.push({
        code: 'primary_image_rights_required',
        message: 'The primary image must have a rights statement.',
      });
    }

    const hasUsefulAltText = Boolean(
      primary && primary.alt_text && primary.alt_text.trim().length >= 5,
    );
    if (hasPrimaryImage && !hasUsefulAltText) {
      issues.push({
        code: 'primary_image_alt_text_required',
        message: 'The primary image must have descriptive alt text.',
      });
    }

    const unapprovedAttachmentsCount = attachments.filter(
      (a) => a.processing_status !== 'approved',
    ).length;
    if (unapprovedAttachmentsCount > 0) {
      issues.push({
        code: 'unapproved_attachments_present',
        message: 'All attached media must be approved.',
      });
    }

    return {
      hasPrimaryImage,
      isPrimaryImageApproved,
      hasRightsStatement,
      hasUsefulAltText,
      unapprovedAttachmentsCount,
      valid: issues.length === 0,
      issues,
    };
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
        detected_content_type, byte_size, processing_status, owner_user_id, media_kind
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

export function approvedVideoPlayback(
  media: Pick<MediaRow, 'media_kind' | 'processing_status' | 'derivative_storage_key'>,
): { storageKey: string; contentType: 'video/mp4' } | null {
  if (
    media.media_kind !== 'video' ||
    media.processing_status !== 'approved' ||
    !media.derivative_storage_key?.startsWith('processed/') ||
    media.derivative_storage_key.includes('..')
  ) {
    return null;
  }
  return { storageKey: media.derivative_storage_key, contentType: 'video/mp4' };
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

  // MP4 container: starts with box size, then 'ftyp' box type, then compatible major brand
  if (bytes.length >= 12 && text(bytes, 4, 8) === 'ftyp') {
    const brand = text(bytes, 8, 12).toLowerCase().trim();
    const validBrands = [
      'isom',
      'iso2',
      'mp41',
      'mp42',
      'dash',
      'avc1',
      'qt',
      'm4v',
      'msnv',
      'mp4v',
    ];
    if (validBrands.some((b) => brand.startsWith(b))) {
      return 'video/mp4';
    }
  }

  // WebM container: EBML header ID 0x1A45DFA3 containing DocType "webm"
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    const sliceText = text(bytes, 4, Math.min(bytes.length, 128));
    if (sliceText.includes('webm')) {
      return 'video/webm';
    }
  }

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
