import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { DataSource } from 'typeorm';
import sharp from 'sharp';
import { Environment } from '../config/environment';

interface ProcessingMediaRow {
  id: string;
  storage_key: string;
  declared_content_type: string;
  byte_size: string;
  media_kind: 'image' | 'document';
  processing_status: string;
}

interface ExpiredUploadRow {
  id: string;
  storage_key: string;
}

interface PreparedDerivative {
  kind: 'display' | 'thumbnail' | 'page';
  pageNumber: number | null;
  storageKey: string;
  buffer: Buffer;
  width: number;
  height: number;
  sha256: string;
}

class UnsafeMediaError extends Error {
  constructor(
    readonly failureCode: string,
    message: string,
    readonly deleteOriginal = true,
  ) {
    super(message);
  }
}

@Injectable()
export class MediaProcessorService {
  private readonly client?: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Environment, true>,
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

  async process(mediaAssetId: string): Promise<void> {
    const media = await this.claim(mediaAssetId);
    if (!media) return;
    const client = this.requireStorage();
    const directory = await mkdtemp(join(tmpdir(), 'gk-media-'));
    const sourcePath = join(
      directory,
      media.media_kind === 'document' ? 'source.pdf' : 'source.bin',
    );
    const uploadedKeys: string[] = [];

    try {
      const sourceHash = await this.download(client, media, sourcePath);
      let scan: Awaited<ReturnType<typeof scanFileWithClam>>;
      try {
        scan = await scanFileWithClam(sourcePath, {
          host: this.config.get('MEDIA_SCANNER_HOST', { infer: true }),
          port: this.config.get('MEDIA_SCANNER_PORT', { infer: true }),
          timeoutMs: this.config.get('MEDIA_SCANNER_TIMEOUT_MS', { infer: true }),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'unknown transport error';
        throw new Error(`Malware scanner unavailable: ${detail}`, { cause: error });
      }
      if (scan.status === 'infected') {
        throw new UnsafeMediaError(
          'malware_detected',
          `Malware scanner detected ${scan.signature}.`,
        );
      }
      if (scan.status !== 'clean') throw new Error(`Malware scanner failed: ${scan.detail}`);

      const derivatives =
        media.media_kind === 'image'
          ? await this.prepareImageDerivatives(media.id, sourcePath)
          : await this.prepareDocumentDerivatives(media.id, sourcePath, directory);

      for (const derivative of derivatives) {
        await client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: derivative.storageKey,
            Body: derivative.buffer,
            ContentType: 'image/webp',
            CacheControl: 'private, no-store, max-age=0',
            Metadata: {
              'asset-id': media.id,
              'derivative-kind': derivative.kind,
              ...(derivative.pageNumber ? { 'page-number': String(derivative.pageNumber) } : {}),
            },
          }),
        );
        uploadedKeys.push(derivative.storageKey);
      }

      await this.dataSource.transaction(async (manager) => {
        await manager.query(`DELETE FROM media_derivatives WHERE media_asset_id = $1`, [media.id]);
        for (const derivative of derivatives) {
          await manager.query(
            `INSERT INTO media_derivatives (
              id, media_asset_id, derivative_kind, page_number, storage_key, content_type,
              byte_size, width, height, sha256
            ) VALUES ($1,$2,$3,$4,$5,'image/webp',$6,$7,$8,$9)`,
            [
              randomUUID(),
              media.id,
              derivative.kind,
              derivative.pageNumber,
              derivative.storageKey,
              derivative.buffer.length,
              derivative.width,
              derivative.height,
              derivative.sha256,
            ],
          );
        }
        await manager.query(
          `UPDATE media_assets SET processing_status = 'approved', sha256 = $2,
            derivative_storage_key = $3, scanner_result = 'clean', failure_code = NULL,
            processed_at = now(), updated_at = now()
           WHERE id = $1 AND processing_status = 'processing'`,
          [media.id, sourceHash, derivatives[0]?.storageKey ?? null],
        );
      });
    } catch (error) {
      await this.deleteObjects(client, uploadedKeys);
      if (error instanceof UnsafeMediaError) {
        if (error.deleteOriginal) await this.deleteObjects(client, [media.storage_key]);
        await this.dataSource.query(
          `UPDATE media_assets SET processing_status = 'rejected', scanner_result = 'rejected',
            failure_code = $2, processed_at = now(), updated_at = now() WHERE id = $1`,
          [media.id, error.failureCode],
        );
        return;
      }
      await this.dataSource.query(
        `UPDATE media_assets SET processing_status = 'failed', failure_code = $2,
          updated_at = now() WHERE id = $1`,
        [media.id, processingFailureCode(error)],
      );
      throw error;
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  async pendingIds(): Promise<string[]> {
    const rows = (await this.dataSource.query(
      `SELECT id FROM media_assets
       WHERE processing_status IN ('quarantined', 'failed')
          OR (processing_status = 'processing' AND processing_started_at < now() - interval '15 minutes')
       ORDER BY created_at LIMIT 500`,
    )) as unknown as Array<{ id: string }>;
    return rows.map((row) => row.id);
  }

  async cleanupExpiredUploads(): Promise<number> {
    const rows = (await this.dataSource.query(
      `SELECT id, storage_key FROM media_assets
       WHERE processing_status = 'pending'
         AND created_at < now() - interval '1 hour'
       ORDER BY created_at
       LIMIT 100`,
    )) as unknown as ExpiredUploadRow[];
    if (!rows.length) return 0;

    const client = this.requireStorage();
    let cleaned = 0;
    const failures: unknown[] = [];
    for (const row of rows) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: row.storage_key }));
        const result = (await this.dataSource.query(
          `UPDATE media_assets SET processing_status = 'archived', failure_code = 'upload_expired',
            updated_at = now()
           WHERE id = $1 AND processing_status = 'pending'
           RETURNING id`,
          [row.id],
        )) as unknown;
        if (normalizeReturnedRows<{ id: string }>(result).length) cleaned += 1;
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length) {
      throw new Error(`Failed to clean ${failures.length} expired media upload(s).`, {
        cause: failures[0],
      });
    }
    return cleaned;
  }

  private async claim(id: string): Promise<ProcessingMediaRow | null> {
    const result = (await this.dataSource.query(
      `UPDATE media_assets SET processing_status = 'processing', processing_attempts = processing_attempts + 1,
        processing_started_at = now(), failure_code = NULL, updated_at = now()
       WHERE id = $1 AND (
         processing_status IN ('quarantined', 'failed')
         OR (processing_status = 'processing' AND processing_started_at < now() - interval '15 minutes')
       )
       RETURNING id, storage_key, declared_content_type, byte_size, media_kind, processing_status`,
      [id],
    )) as unknown;
    // PostgreSQL UPDATE ... RETURNING is represented as [rows, affectedCount] by TypeORM,
    // while test doubles and SELECT queries return rows directly.
    const rows = normalizeReturnedRows<ProcessingMediaRow>(result);
    if (rows[0]) return rows[0];
    const existing = (await this.dataSource.query(`SELECT id FROM media_assets WHERE id = $1`, [
      id,
    ])) as unknown as Array<{ id: string }>;
    if (!existing[0]) throw new NotFoundException('Media asset not found.');
    return null;
  }

  private async download(client: S3Client, media: ProcessingMediaRow, destination: string) {
    const object = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: media.storage_key }),
    );
    if (!object.Body) throw new Error('The quarantined object has no body.');
    const hash = createHash('sha256');
    let bytes = 0;
    const counter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        bytes += chunk.length;
        hash.update(chunk);
        callback(null, chunk);
      },
    });
    await pipeline(object.Body as NodeJS.ReadableStream, counter, createWriteStream(destination));
    if (bytes !== Number(media.byte_size))
      throw new UnsafeMediaError('size_changed', 'Object size changed.');
    return hash.digest('hex');
  }

  private async prepareImageDerivatives(assetId: string, sourcePath: string) {
    const metadata = await sharp(sourcePath, {
      failOn: 'error',
      limitInputPixels: 100_000_000,
      sequentialRead: true,
    }).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 20_000 ||
      metadata.height > 20_000
    ) {
      throw new UnsafeMediaError('unsafe_dimensions', 'Image dimensions are missing or excessive.');
    }
    const display = await sharp(sourcePath, { failOn: 'error', limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: 2_000, height: 2_000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(sourcePath, { failOn: 'error', limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 76 })
      .toBuffer({ resolveWithObject: true });
    return [
      prepared('display', null, `processed/${assetId}/display.webp`, display),
      prepared('thumbnail', null, `processed/${assetId}/thumbnail.webp`, thumbnail),
    ];
  }

  private async prepareDocumentDerivatives(assetId: string, sourcePath: string, directory: string) {
    const info = await runCommand('pdfinfo', [sourcePath], 30_000);
    const parsed = parsePdfInfo(info);
    if (parsed.encrypted)
      throw new UnsafeMediaError('encrypted_pdf', 'Encrypted PDFs are not supported.');
    const maximumPages = this.config.get('MEDIA_MAX_PDF_PAGES', { infer: true });
    if (parsed.pages < 1 || parsed.pages > maximumPages) {
      throw new UnsafeMediaError('pdf_page_limit', 'PDF page count is outside the allowed range.');
    }
    const derivatives: PreparedDerivative[] = [];
    for (let page = 1; page <= parsed.pages; page += 1) {
      const prefix = join(directory, `page-${String(page).padStart(4, '0')}`);
      await runCommand(
        'pdftoppm',
        [
          '-f',
          String(page),
          '-l',
          String(page),
          '-singlefile',
          '-png',
          '-r',
          '110',
          sourcePath,
          prefix,
        ],
        120_000,
      );
      const rendered = await readFile(`${prefix}.png`);
      const pageImage = await sharp(rendered, { failOn: 'error', limitInputPixels: 100_000_000 })
        .resize({ width: 2_000, height: 2_000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      derivatives.push(
        prepared(
          'page',
          page,
          `processed/${assetId}/pages/${String(page).padStart(4, '0')}.webp`,
          pageImage,
        ),
      );
    }
    return derivatives;
  }

  private async deleteObjects(client: S3Client, keys: string[]) {
    for (const key of keys) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch {
        // Cleanup is retried by the deterministic next attempt and operational sweeps.
      }
    }
  }

  private requireStorage(): S3Client {
    if (!this.client || !this.bucket) throw new Error('Private media storage is not configured.');
    return this.client;
  }
}

export function normalizeReturnedRows<T>(result: unknown): T[] {
  if (!Array.isArray(result)) return [];
  return Array.isArray(result[0]) ? (result[0] as T[]) : (result as T[]);
}

function prepared(
  kind: PreparedDerivative['kind'],
  pageNumber: number | null,
  storageKey: string,
  output: { data: Buffer; info: { width: number; height: number } },
): PreparedDerivative {
  return {
    kind,
    pageNumber,
    storageKey,
    buffer: output.data,
    width: output.info.width,
    height: output.info.height,
    sha256: createHash('sha256').update(output.data).digest('hex'),
  };
}

export function parsePdfInfo(value: string): { pages: number; encrypted: boolean } {
  const pages = Number(/^Pages:\s+(\d+)$/im.exec(value)?.[1] ?? 0);
  const encrypted = /^Encrypted:\s+yes/im.test(value);
  return { pages, encrypted };
}

export function parseClamResponse(
  value: string,
):
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  | { status: 'error'; detail: string } {
  const response = value.replace(/\0/g, '').trim();
  if (/:\s+OK$/i.test(response)) return { status: 'clean' };
  const infected = /:\s+(.+)\s+FOUND$/i.exec(response);
  if (infected) return { status: 'infected', signature: infected[1]!.trim() };
  return { status: 'error', detail: response || 'empty scanner response' };
}

async function scanFileWithClam(
  path: string,
  options: { host: string; port: number; timeoutMs: number },
) {
  const socket = createConnection({ host: options.host, port: options.port });
  socket.setTimeout(options.timeoutMs);
  try {
    await Promise.race([
      once(socket, 'connect'),
      once(socket, 'timeout').then(() => {
        throw new Error('Malware scanner connection timed out.');
      }),
      once(socket, 'error').then(([error]) => {
        throw error;
      }),
    ]);
    socket.write('zINSTREAM\0');
    for await (const chunk of createReadStream(path, { highWaterMark: 64 * 1024 })) {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const length = Buffer.allocUnsafe(4);
      length.writeUInt32BE(data.length);
      if (!socket.write(Buffer.concat([length, data]))) await once(socket, 'drain');
    }
    socket.write(Buffer.alloc(4));
    const chunks: Buffer[] = [];
    for await (const rawChunk of socket) {
      const chunk = rawChunk as Buffer;
      chunks.push(chunk);
      if (chunks.some((entry) => entry.includes(0))) break;
    }
    return parseClamResponse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    socket.destroy();
  }
}

async function runCommand(command: string, args: string[], timeoutMs: number): Promise<string> {
  const child = spawn(command, args, { shell: false, windowsHide: true });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
  child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
  const timeout = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
  try {
    const [code] = (await once(child, 'close')) as [number | null];
    if (code !== 0)
      throw new UnsafeMediaError('document_render_failed', stderr.trim() || `${command} failed.`);
    return stdout;
  } finally {
    clearTimeout(timeout);
  }
}

function processingFailureCode(error: unknown): string {
  if (error instanceof Error && /scanner/i.test(error.message)) return 'scanner_unavailable';
  return 'processing_failed';
}
