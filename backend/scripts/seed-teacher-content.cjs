// Explicit content import; never called by application startup or the foundation seed.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const BUNDLE = 'teacher-content-v1';
const ACTION = 'teacher-content.seed.checkpoint';
class SeedError extends Error {}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function loadBundle(directory) {
  const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
  if (
    manifest.key !== BUNDLE ||
    manifest.version !== 1 ||
    manifest.categories.length !== 6 ||
    manifest.records.length !== 10
  ) {
    throw new SeedError('The packaged content manifest is invalid.');
  }
  const images = new Map();
  for (const image of manifest.images) {
    if (!/^[a-z0-9-]+\.jpg$/.test(image.filename) || images.has(image.key))
      throw new SeedError('Invalid image entry.');
    const bytes = await fs.readFile(path.join(directory, image.filename));
    if (
      hash(bytes) !== image.sha256 ||
      !image.credit ||
      !image.licence ||
      !image.rightsStatement ||
      new URL(image.source).protocol !== 'https:'
    ) {
      throw new SeedError('An image checksum or attribution failed validation.');
    }
    images.set(image.key, { ...image, bytes });
  }
  for (const item of [...manifest.categories, ...manifest.records]) {
    if (!images.has(item.image) || !item.title || !item.summary || !item.description)
      throw new SeedError('Incomplete content entry.');
  }
  if (
    new Set(manifest.records.map((item) => images.get(item.image).sha256)).size !== 10 ||
    new Set(manifest.records.map((item) => item.slug)).size !== 10 ||
    new Set(manifest.categories.map((item) => item.slug)).size !== 6
  )
    throw new SeedError('Duplicate record image or content key.');
  for (const record of manifest.records) {
    if (
      !record.sources.length ||
      record.sources.some((s) => !s.title || new URL(s.url).protocol !== 'https:')
    )
      throw new SeedError('Incomplete record evidence.');
  }
  return { ...manifest, images };
}

async function checkpoint(db, key) {
  const [row] = await db.query(
    `SELECT metadata FROM content_audit_events
    WHERE action=$1 AND target_type='seed_bundle' AND target_id=$2 ORDER BY id DESC LIMIT 1`,
    [ACTION, `${BUNDLE}:${key}`],
  );
  return row?.metadata ?? null;
}
async function saveCheckpoint(db, actor, key, metadata) {
  await db.query(
    `INSERT INTO content_audit_events(actor_user_id,action,target_type,target_id,metadata)
    VALUES($1,$2,'seed_bundle',$3,$4::jsonb)`,
    [actor, ACTION, `${BUNDLE}:${key}`, JSON.stringify(metadata)],
  );
}

// Keep service revisions, evidence, publication and the import marker in one transaction.
async function withTransaction(db, body) {
  return db.transaction(async (manager) => {
    const scoped = Object.create(db);
    scoped.query = manager.query.bind(manager);
    scoped.transaction = async (callback) => callback(manager);
    return body(scoped);
  });
}

async function preflight(db, bundle) {
  const [actor] =
    await db.query(`SELECT id FROM users WHERE status='active' AND role IN ('admin','teacher')
    ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END,created_at,id LIMIT 1`);
  if (!actor)
    throw new SeedError(
      'Sign in and create an active authorized admin/teacher before importing content. No account or permission is created by this seed.',
    );
  const categories = new Map();
  for (const profile of bundle.categories) {
    const [category] = await db.query(
      `SELECT c.id,c.position,c.image_media_asset_id,ct.name,ct.summary,ct.description,
      EXISTS(SELECT 1 FROM media_assets m WHERE m.id=c.image_media_asset_id AND m.media_kind='image' AND m.processing_status='approved' AND btrim(m.rights_statement)<>'') AS image_ready,
      EXISTS(SELECT 1 FROM category_draft_revisions d WHERE d.category_id=c.id) AS has_draft
      FROM categories c JOIN category_translations ct ON ct.category_id=c.id AND ct.locale='en'
      WHERE c.slug=$1 AND c.parent_id IS NULL AND c.status='active'`,
      [profile.slug],
    );
    if (!category)
      throw new SeedError(`Missing main category ${profile.slug}; run reviewed migrations first.`);
    if (category.has_draft)
      throw new SeedError(
        `Pending category draft preserved: ${profile.slug}. Resolve it before importing.`,
      );
    const blank =
      !category.summary?.trim() && !category.description?.trim() && !category.image_media_asset_id;
    const same =
      category.summary === profile.summary &&
      category.description === profile.description &&
      Boolean(category.image_media_asset_id) &&
      category.image_ready;
    if (!blank && !same)
      throw new SeedError(
        `Existing category content preserved: ${profile.slug}. Import refuses to overwrite it.`,
      );
    categories.set(profile.slug, { ...category, skip: same });
  }
  const bindings = new Map();
  for (const record of bundle.records) {
    const [binding] = await db.query(
      `SELECT c.id AS category_id,crt.record_type_id FROM categories c
      JOIN category_record_types crt ON crt.category_id=c.id AND crt.status='active'
      JOIN record_types rt ON rt.id=crt.record_type_id AND rt.status='active'
      WHERE c.slug=$1 AND c.status='active' AND rt.stable_key=$2`,
      [record.category, record.type],
    );
    if (!binding)
      throw new SeedError(
        `Missing classification for ${record.slug}; run reviewed migrations first.`,
      );
    const [existing] = await db.query(`SELECT id,status FROM scientific_records WHERE slug=$1`, [
      record.slug,
    ]);
    if (existing && existing.status !== 'published')
      throw new SeedError(
        `Existing unpublished record preserved: ${record.slug}. Resolve it before importing.`,
      );
    bindings.set(record.slug, { ...binding, skip: Boolean(existing) });
  }
  return { actor: actor.id, categories, bindings };
}

async function ensureImage(ctx, image) {
  const key = `image:${image.key}`;
  const saved = await checkpoint(ctx.db, key);
  let mediaId = saved?.mediaId;
  let row;
  if (mediaId) {
    [row] = await ctx.db.query(
      `SELECT id,owner_user_id,processing_status,sha256,scanner_result,storage_key FROM media_assets WHERE id=$1`,
      [mediaId],
    );
    if (!row || row.owner_user_id !== ctx.actor || saved.sha256 !== image.sha256)
      throw new SeedError(`Saved media conflicts with bundle: ${image.key}.`);
  } else {
    const upload = await ctx.media.initiate(ctx.actor, {
      filename: image.filename,
      contentType: 'image/jpeg',
      byteSize: image.bytes.length,
      credit: image.credit,
      licence: image.licence,
      rightsStatement: image.rightsStatement,
    });
    mediaId = upload.mediaAssetId;
    await saveCheckpoint(ctx.db, ctx.actor, key, { mediaId, sha256: image.sha256 });
    [row] = await ctx.db.query(
      `SELECT id,processing_status,storage_key FROM media_assets WHERE id=$1`,
      [mediaId],
    );
  }
  if (row.processing_status === 'pending') {
    await ctx.upload(row.storage_key, mediaId, image.bytes);
    await ctx.media.confirm(ctx.actor, mediaId);
  } else if (!['approved', 'quarantined', 'failed'].includes(row.processing_status)) {
    throw new SeedError(
      `Media ${image.key} is processing, rejected or archived; do not bypass its lifecycle.`,
    );
  }
  if (row.processing_status !== 'approved') await ctx.processor.process(mediaId);
  const [approved] = await ctx.db.query(
    `SELECT id FROM media_assets WHERE id=$1 AND processing_status='approved'
    AND scanner_result='clean' AND sha256=$2 AND owner_user_id=$3
    AND (SELECT count(*) FROM media_derivatives WHERE media_asset_id=$1 AND derivative_kind IN ('display','thumbnail'))=2`,
    [mediaId, image.sha256, ctx.actor],
  );
  if (!approved)
    throw new SeedError(`Media did not pass scanning and derivative checks: ${image.key}.`);
  const derivatives = await ctx.db.query(
    `SELECT storage_key FROM media_derivatives WHERE media_asset_id=$1 AND derivative_kind IN ('display','thumbnail')`,
    [mediaId],
  );
  for (const derivative of derivatives) await ctx.verify(derivative.storage_key);
  return mediaId;
}

async function seedCategory(ctx, profile, category) {
  if (category.skip) return false;
  const imageId = await ctx.image(profile.image);
  await withTransaction(ctx.db, async (db) => {
    const structure = ctx.services(db).structure;
    // Recheck after the image upload; never replace an editor's intervening draft.
    const [current] = await db.query(
      `SELECT c.id,c.image_media_asset_id,ct.summary,ct.description,
      EXISTS(SELECT 1 FROM category_draft_revisions d WHERE d.category_id=c.id) AS has_draft
      FROM categories c JOIN category_translations ct ON ct.category_id=c.id AND ct.locale='en' WHERE c.id=$1 FOR UPDATE OF c`,
      [category.id],
    );
    if (
      !current ||
      current.has_draft ||
      current.summary?.trim() ||
      current.description?.trim() ||
      current.image_media_asset_id
    )
      throw new SeedError(
        `Category changed during import: ${profile.slug}. Preserved without overwrite.`,
      );
    await structure.editCategory(ctx.actor, category.id, {
      title: category.name,
      summary: profile.summary,
      description: profile.description,
      imageMediaAssetId: imageId,
      position: category.position,
    });
    await structure.publishCategory(ctx.actor, category.id);
    await saveCheckpoint(db, ctx.actor, `category:${profile.slug}`, { categoryId: category.id });
  });
  return true;
}

async function seedRecord(ctx, record, binding) {
  if (binding.skip) return false;
  const imageId = await ctx.image(record.image);
  await withTransaction(ctx.db, async (db) => {
    const duplicates = await db.query(
      `SELECT 1 FROM record_media rm
      JOIN media_assets existing ON existing.id=rm.media_asset_id
      JOIN media_assets incoming ON incoming.id=$1
      WHERE rm.is_primary AND existing.sha256=incoming.sha256 LIMIT 1`,
      [imageId],
    );
    if (duplicates.length)
      throw new SeedError(
        `Record image is already used by another record: ${record.slug}. Existing content preserved.`,
      );
    const { records, trust, media } = ctx.services(db);
    const created = await records.create(ctx.actor, {
      categoryId: binding.category_id,
      recordTypeId: binding.record_type_id,
      slug: record.slug,
      attributes: record.attributes,
    });
    await records.upsertTranslation(ctx.actor, created.id, 'en', {
      title: record.title,
      summary: record.summary,
      description: record.description,
      sourceLocale: 'en',
    });
    for (const source of record.sources) {
      const reference = await trust.createReference(ctx.actor, {
        sourceType: source.type,
        authors: source.authors ?? [],
        title: source.title,
        publication: source.publication,
        publicationYear: source.year,
        pagesOrFigure: source.pages,
        sourceUrl: source.url,
      });
      await trust.addEvidence(ctx.actor, created.id, {
        referenceId: reference.id,
        evidenceKind: 'supporting',
        notes: source.pages
          ? `Relevant passage: ${source.pages}`
          : 'Supports the identification or descriptive claims in this record.',
      });
    }
    await media.attachToRecord(ctx.actor, created.id, {
      mediaAssetId: imageId,
      purpose: 'primary',
      caption: record.caption,
      description: record.caption,
      altText: record.alt,
      position: 0,
      isPrimary: true,
    });
    await records.submitForReview(ctx.actor, created.id);
    await records.publish(ctx.actor, created.id);
    await saveCheckpoint(db, ctx.actor, `record:${record.slug}`, { recordId: created.id });
  });
  return true;
}

async function main(args = process.argv.slice(2)) {
  if (args.some((arg) => arg !== '--dry-run'))
    throw new SeedError(
      'Only --dry-run is supported. This command has no reset or force-overwrite mode.',
    );
  const bundle = await loadBundle(path.resolve(__dirname, '../assets', BUNDLE));
  require('../dist/config/load-root-environment');
  const { appDataSource: db } = require('../dist/database/data-source');
  const { validateEnvironment } = require('../dist/config/environment');
  const { ConfigService } = require('@nestjs/config');
  const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
  const { MediaService } = require('../dist/media/media.service');
  const { MediaProcessorService } = require('../dist/media/media-processor.service');
  const { ScientificTrustService } = require('../dist/publishing/scientific-trust.service');
  const { RecordsService } = require('../dist/scientific-content/records.service');
  const {
    ScientificStructureService,
  } = require('../dist/scientific-content/scientific-structure.service');
  const env = validateEnvironment(process.env);
  if (
    !env.MEDIA_STORAGE_ENDPOINT ||
    !env.MEDIA_STORAGE_BUCKET ||
    !env.MEDIA_STORAGE_KEY_ID ||
    !env.MEDIA_STORAGE_APPLICATION_KEY
  )
    throw new SeedError(
      'Configure the existing private media storage before importing. No credentials are printed.',
    );
  const config = new ConfigService(env);
  const services = (source) => {
    const trust = new ScientificTrustService(source);
    return {
      trust,
      records: new RecordsService(source, trust),
      structure: new ScientificStructureService(source),
      media: new MediaService(source, config, { enqueueMedia: async () => null }),
    };
  };
  await db.initialize();
  const lock = db.createQueryRunner();
  let acquired = false;
  try {
    await lock.connect();
    const [result] = await lock.query(`SELECT pg_try_advisory_lock(hashtext($1)) AS locked`, [
      BUNDLE,
    ]);
    if (!result?.locked)
      throw new SeedError('Another content seed is running. Wait for it to finish.');
    acquired = true;
    const plan = await preflight(db, bundle);
    console.log(
      `Preflight passed: 6 category profiles, 10 records, 10 distinct record images; ${bundle.images.size} packaged images.`,
    );
    if (args.includes('--dry-run')) {
      console.log('Dry run: no database rows, storage objects or publication states changed.');
      return;
    }
    const storage = new S3Client({
      endpoint: env.MEDIA_STORAGE_ENDPOINT,
      region: env.MEDIA_STORAGE_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.MEDIA_STORAGE_KEY_ID,
        secretAccessKey: env.MEDIA_STORAGE_APPLICATION_KEY,
      },
    });
    const ctx = {
      db,
      actor: plan.actor,
      services,
      media: services(db).media,
      processor: new MediaProcessorService(db, config),
      verify: (key) =>
        storage.send(new HeadObjectCommand({ Bucket: env.MEDIA_STORAGE_BUCKET, Key: key })),
      upload: (key, id, bytes) =>
        storage.send(
          new PutObjectCommand({
            Bucket: env.MEDIA_STORAGE_BUCKET,
            Key: key,
            Body: bytes,
            ContentType: 'image/jpeg',
            ContentLength: bytes.length,
            Metadata: { 'asset-id': id },
          }),
        ),
    };
    const cache = new Map();
    ctx.image = async (key) => {
      if (!cache.has(key)) cache.set(key, await ensureImage(ctx, bundle.images.get(key)));
      return cache.get(key);
    };
    try {
      for (const profile of bundle.categories) {
        const added = await seedCategory(ctx, profile, plan.categories.get(profile.slug));
        console.log(`${profile.slug}: ${added ? 'profile published' : 'existing profile kept'}`);
      }
      for (const record of bundle.records) {
        const added = await seedRecord(ctx, record, plan.bindings.get(record.slug));
        console.log(
          `${record.slug}: ${added ? 'record published' : 'existing published record kept'}`,
        );
      }
      console.log(
        'Content seed finished. Existing records were preserved; no records were deleted.',
      );
    } finally {
      storage.destroy();
    }
  } finally {
    if (acquired) await lock.query(`SELECT pg_advisory_unlock(hashtext($1))`, [BUNDLE]);
    await lock.release();
    await db.destroy();
  }
}

module.exports = {
  SeedError,
  loadBundle,
  preflight,
  ensureImage,
  seedCategory,
  seedRecord,
  withTransaction,
  main,
};
if (require.main === module)
  main().catch((error) => {
    // Never print provider exceptions, signed URLs, database credentials or stack traces.
    console.error(
      error instanceof SeedError
        ? error.message
        : 'Content seed stopped safely. Check migrations, authorized owner, storage and ClamAV availability; no failed item was published. Re-run --dry-run after correcting the cause.',
    );
    process.exitCode = 1;
  });
