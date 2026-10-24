import 'dotenv/config';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { validateEnvironment } from '../config/environment';
import { appDataSource } from './data-source';
import {
  CURATED_IMAGE_SOURCES,
  CURATED_SCIENTIFIC_RECORDS,
  CuratedImageSource,
} from './curated-scientific-catalog';

interface StructureRow {
  category_id: string;
  record_type_id: string;
  template_version_id: string;
  category_key: string;
  record_type_key: string;
}

interface UserRow {
  id: string;
}

const SEED_NAMESPACE = 'geo-kurdistan:curated-scientific-catalog:v1';
const isDryRun = process.argv.includes('--dry-run');

export function stableSeedUuid(key: string): string {
  const bytes = Buffer.from(
    createHash('sha256').update(`${SEED_NAMESPACE}:${key}`).digest('hex').slice(0, 32),
    'hex',
  );
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function seedCuratedCatalog(): Promise<void> {
  assertCatalogIntegrity();
  const environment = validateEnvironment(process.env);
  const assetDirectory = process.env.CURATED_SEED_ASSET_DIR
    ? path.resolve(process.env.CURATED_SEED_ASSET_DIR)
    : path.resolve(process.cwd(), '../frontend/public/images');

  await appDataSource.initialize();
  try {
    const actor = await loadActor();
    const structures = await loadStructures();
    validateStructures(structures);
    await assertAssetFiles(assetDirectory);

    if (isDryRun) {
      process.stdout.write(
        `Dry run passed: ${CURATED_SCIENTIFIC_RECORDS.length} records, ${CURATED_IMAGE_SOURCES.length} traceable images, no database or storage changes.\n`,
      );
      return;
    }

    const storage = createStorageClient(environment);
    for (const image of CURATED_IMAGE_SOURCES) {
      await ensureMediaAsset(storage.client, storage.bucket, actor.id, assetDirectory, image);
    }

    const structureMap = new Map(
      structures.map((row) => [`${row.category_key}:${row.record_type_key}`, row]),
    );

    await appDataSource.transaction(async (manager) => {
      for (const image of CURATED_IMAGE_SOURCES) {
        await manager.query(
          `INSERT INTO scientific_references (
             id, source_type, authors, title, publication, source_url, rights_statement,
             verification_status, created_by_user_id
           ) VALUES ($1, 'image_repository', $2::jsonb, $3, 'Wikimedia Commons / source repository', $4, $5, 'unverified', $6)
           ON CONFLICT (id) DO NOTHING`,
          [
            stableSeedUuid(`reference:${image.key}`),
            JSON.stringify([image.creator]),
            image.title,
            image.sourceUrl,
            image.rightsStatement,
            actor.id,
          ],
        );
      }

      for (const record of CURATED_SCIENTIFIC_RECORDS) {
        const structure = structureMap.get(`${record.category}:${record.recordType}`);
        if (!structure) throw new Error(`Missing structure for ${record.key}.`);
        const recordId = stableSeedUuid(`record:${record.key}`);
        const mediaAssetId = stableSeedUuid(`media:${record.image}`);
        const referenceId = stableSeedUuid(`reference:${record.image}`);

        await manager.query(
          `INSERT INTO scientific_records (
             id, stable_id, slug, status, category_id, record_type_id,
             template_version_id, attributes, owner_user_id
           ) VALUES ($1,$2,$3,'draft',$4,$5,$6,$7::jsonb,$8)
           ON CONFLICT (id) DO NOTHING`,
          [
            recordId,
            stableSeedUuid(`public-record:${record.key}`),
            `curated-${record.key}`,
            structure.category_id,
            structure.record_type_id,
            structure.template_version_id,
            JSON.stringify(record.attributes),
            actor.id,
          ],
        );
        await manager.query(
          `INSERT INTO record_translations (
             record_id, locale, title, summary, description, source_locale,
             status, translator_user_id
           ) VALUES ($1,'en',$2,$3,$4,'en','draft',$5)
           ON CONFLICT (record_id, locale) DO NOTHING`,
          [recordId, record.title, record.summary, record.description, actor.id],
        );
        await manager.query(
          `INSERT INTO record_media (
             record_id, media_asset_id, purpose, position, caption,
             description, alt_text, is_primary
           ) VALUES ($1,$2,'documentary',0,$3,$4,$5,true)
           ON CONFLICT (record_id, media_asset_id) DO NOTHING`,
          [
            recordId,
            mediaAssetId,
            record.imageCaption,
            record.imageDescription,
            record.imageAltText,
          ],
        );
        await manager.query(
          `INSERT INTO record_evidence (
             id, record_id, reference_id, evidence_kind, notes, created_by_user_id
           ) VALUES ($1,$2,$3,'visual_source',$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [
            stableSeedUuid(`evidence:${record.key}`),
            recordId,
            referenceId,
            'Traceable source for the attached documentary image; scientific interpretation remains unverified.',
            actor.id,
          ],
        );
        await manager.query(
          `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
           SELECT $1, 'scientific-record.curated-seed-created', 'scientific-record', $2::text, $3::jsonb
           WHERE NOT EXISTS (
             SELECT 1 FROM content_audit_events
             WHERE action = 'scientific-record.curated-seed-created'
               AND target_type = 'scientific-record' AND target_id = $2::text
           )`,
          [actor.id, recordId, JSON.stringify({ dataset: 'curated-scientific-catalog-v1' })],
        );
      }
    });

    const taskRecordIds = CURATED_SCIENTIFIC_RECORDS.map((record) =>
      stableSeedUuid(`record:${record.key}`),
    );
    const counts = await appDataSource.query<
      Array<{ records: string; media: string; references: string }>
    >(
      `SELECT
         (SELECT count(*) FROM scientific_records WHERE id = ANY($1::uuid[]))::text AS records,
         (SELECT count(*) FROM media_assets WHERE id = ANY($2::uuid[]))::text AS media,
         (SELECT count(*) FROM scientific_references WHERE id = ANY($3::uuid[]))::text AS references`,
      [
        taskRecordIds,
        CURATED_IMAGE_SOURCES.map((image) => stableSeedUuid(`media:${image.key}`)),
        CURATED_IMAGE_SOURCES.map((image) => stableSeedUuid(`reference:${image.key}`)),
      ],
    );
    process.stdout.write(
      `Curated seed complete: ${counts[0]?.records ?? '0'} drafts, ${counts[0]?.media ?? '0'} media assets, ${counts[0]?.references ?? '0'} source references. Existing rows were not reset or overwritten.\n`,
    );
  } finally {
    await appDataSource.destroy();
  }
}

async function loadActor(): Promise<UserRow> {
  const users = await appDataSource.query<UserRow[]>(
    `SELECT id FROM users
     WHERE status = 'active' AND role IN ('teacher', 'admin')
     ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, created_at, id
     LIMIT 1`,
  );
  if (!users[0]) throw new Error('An active teacher or admin is required to own curated drafts.');
  return users[0];
}

async function loadStructures(): Promise<StructureRow[]> {
  return appDataSource.query<StructureRow[]>(
    `SELECT c.id AS category_id, rt.id AS record_type_id,
            crt.active_template_version_id AS template_version_id,
            c.stable_key AS category_key, rt.stable_key AS record_type_key
     FROM category_record_types crt
     JOIN categories c ON c.id = crt.category_id
     JOIN record_types rt ON rt.id = crt.record_type_id
     JOIN template_versions tv ON tv.id = crt.active_template_version_id
     WHERE c.status = 'active' AND rt.status = 'active'
       AND crt.status = 'active' AND tv.status = 'active'`,
  );
}

function validateStructures(structures: StructureRow[]): void {
  const available = new Set(structures.map((row) => `${row.category_key}:${row.record_type_key}`));
  const missing = CURATED_SCIENTIFIC_RECORDS.filter(
    (record) => !available.has(`${record.category}:${record.recordType}`),
  );
  if (missing.length) {
    throw new Error(
      `Curated seed requires active managed structures that are unavailable: ${missing.map((item) => item.key).join(', ')}`,
    );
  }
}

async function assertAssetFiles(assetDirectory: string): Promise<void> {
  for (const image of CURATED_IMAGE_SOURCES) {
    await readFile(path.join(assetDirectory, image.filename));
  }
}

function createStorageClient(environment: ReturnType<typeof validateEnvironment>): {
  client: S3Client;
  bucket: string;
} {
  if (
    !environment.MEDIA_STORAGE_ENDPOINT ||
    !environment.MEDIA_STORAGE_BUCKET ||
    !environment.MEDIA_STORAGE_KEY_ID ||
    !environment.MEDIA_STORAGE_APPLICATION_KEY
  ) {
    throw new Error('Private media storage must be configured for the curated seed.');
  }
  return {
    bucket: environment.MEDIA_STORAGE_BUCKET,
    client: new S3Client({
      endpoint: environment.MEDIA_STORAGE_ENDPOINT,
      region: environment.MEDIA_STORAGE_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: environment.MEDIA_STORAGE_KEY_ID,
        secretAccessKey: environment.MEDIA_STORAGE_APPLICATION_KEY,
      },
    }),
  };
}

async function ensureMediaAsset(
  client: S3Client,
  bucket: string,
  ownerUserId: string,
  assetDirectory: string,
  image: CuratedImageSource,
): Promise<void> {
  const id = stableSeedUuid(`media:${image.key}`);
  const sourceBytes = await readFile(path.join(assetDirectory, image.filename));
  const originalKey = `quarantine/curated-catalog-v1/${id}.jpg`;
  const displayKey = `processed/curated-catalog-v1/${id}/display.webp`;
  const thumbnailKey = `processed/curated-catalog-v1/${id}/thumbnail.webp`;
  const [display, thumbnail] = await Promise.all([
    makeSquareDerivative(sourceBytes, 1200),
    makeSquareDerivative(sourceBytes, 480),
  ]);

  await putIfMissing(client, bucket, originalKey, sourceBytes, 'image/jpeg');
  await putIfMissing(client, bucket, displayKey, display.bytes, 'image/webp');
  await putIfMissing(client, bucket, thumbnailKey, thumbnail.bytes, 'image/webp');

  await appDataSource.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO media_assets (
         id, storage_key, original_filename, declared_content_type, detected_content_type,
         byte_size, sha256, media_kind, processing_status, rights_statement,
         licence, credit, owner_user_id, processing_attempts, processed_at, scanner_result
       ) VALUES ($1,$2,$3,'image/jpeg','image/jpeg',$4,$5,'image','approved',$6,$7,$8,$9,1,now(),'curated-repository-asset')
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        originalKey,
        path.basename(image.filename),
        sourceBytes.byteLength,
        sha256(sourceBytes),
        image.rightsStatement,
        image.licence,
        image.creator,
        ownerUserId,
      ],
    );
    for (const derivative of [
      { kind: 'display', key: displayKey, value: display },
      { kind: 'thumbnail', key: thumbnailKey, value: thumbnail },
    ]) {
      await manager.query(
        `INSERT INTO media_derivatives (
           id, media_asset_id, derivative_kind, page_number, storage_key,
           content_type, byte_size, width, height, sha256
         ) VALUES ($1,$2,$3,NULL,$4,'image/webp',$5,$6,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
        [
          stableSeedUuid(`derivative:${image.key}:${derivative.kind}`),
          id,
          derivative.kind,
          derivative.key,
          derivative.value.bytes.byteLength,
          derivative.value.size,
          sha256(derivative.value.bytes),
        ],
      );
    }
  });
}

async function makeSquareDerivative(
  source: Buffer,
  size: number,
): Promise<{ bytes: Buffer; size: number }> {
  const bytes = await sharp(source)
    .rotate()
    .resize(size, size, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84 })
    .toBuffer();
  return { bytes, size };
}

async function putIfMissing(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return;
  } catch (error: unknown) {
    const status =
      typeof error === 'object' && error !== null && '$metadata' in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined;
    if (status !== 404) throw error;
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.byteLength,
      Metadata: { dataset: 'curated-scientific-catalog-v1' },
    }),
  );
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

export function assertCatalogIntegrity(): void {
  if (CURATED_SCIENTIFIC_RECORDS.length !== 36) {
    throw new Error(`Expected 36 curated records, received ${CURATED_SCIENTIFIC_RECORDS.length}.`);
  }
  const imageKeys = new Set(CURATED_IMAGE_SOURCES.map((image) => image.key));
  const recordKeys = new Set<string>();
  for (const record of CURATED_SCIENTIFIC_RECORDS) {
    if (recordKeys.has(record.key)) throw new Error(`Duplicate curated record key: ${record.key}.`);
    recordKeys.add(record.key);
    if (!imageKeys.has(record.image)) throw new Error(`Unknown image ${record.image}.`);
    if (!record.title.trim() || !record.summary.trim() || !record.description.trim()) {
      throw new Error(`Incomplete curated record text: ${record.key}.`);
    }
    if (record.imageAltText.trim().length < 5) {
      throw new Error(`Image alt text is too short: ${record.key}.`);
    }
  }
}

void seedCuratedCatalog().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown curated seed failure';
  process.stderr.write(`Curated seed failed: ${message}\n`);
  process.exitCode = 1;
});
