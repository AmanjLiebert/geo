import 'dotenv/config';
import { ScientificTrustService } from '../publishing/scientific-trust.service';
import { assertRecordEditable } from '../scientific-content/record-invariants';
import { RecordsService } from '../scientific-content/records.service';
import { ScientificRecordStatus } from '../scientific-content/scientific-content.types';
import {
  CURATED_IMAGE_SOURCES,
  CURATED_SCIENTIFIC_RECORDS,
  stableCatalogUuid,
} from './curated-scientific-catalog';
import { appDataSource } from './data-source';

interface RecordStateRow {
  id: string;
  owner_user_id: string;
  status: ScientificRecordStatus;
}

interface ReviewerRow {
  id: string;
}

interface ReferenceStateRow {
  id: string;
}

interface AttachmentStateRow {
  caption: string | null;
  description: string | null;
  alt_text: string | null;
}

const isDryRun = process.argv.includes('--dry-run');

async function publishCuratedCatalog(): Promise<void> {
  const recordIds = CURATED_SCIENTIFIC_RECORDS.map((record) =>
    stableCatalogUuid(`record:${record.key}`),
  );
  const referenceIds = CURATED_IMAGE_SOURCES.map((image) =>
    stableCatalogUuid(`reference:${image.key}`),
  );

  await appDataSource.initialize();
  try {
    const states = await loadRecordStates(recordIds);
    if (states.length !== recordIds.length) {
      throw new Error(
        `The curated seed is incomplete: expected ${recordIds.length} records, found ${states.length}.`,
      );
    }

    const owners = new Set(states.map((record) => record.owner_user_id));
    if (owners.size !== 1) {
      throw new Error('Curated records must have one consistent owner before publication.');
    }
    const ownerUserId = states[0]?.owner_user_id;
    if (!ownerUserId) throw new Error('The curated record owner is unavailable.');

    const reviewer = await loadIndependentReviewer(ownerUserId);
    const references = await loadReferenceStates(referenceIds);
    if (references.length !== referenceIds.length) {
      throw new Error(
        `The curated seed is incomplete: expected ${referenceIds.length} references, found ${references.length}.`,
      );
    }

    const published = states.filter(
      (record) => record.status === ScientificRecordStatus.PUBLISHED,
    ).length;
    const pending = states.length - published;
    if (isDryRun) {
      process.stdout.write(
        `Dry run passed: ${published} already published, ${pending} pending, independent reviewer available; no changes made.\n`,
      );
      return;
    }

    const trust = new ScientificTrustService(appDataSource);
    const records = new RecordsService(appDataSource, trust);

    const stateById = new Map(states.map((record) => [record.id, record]));
    for (const curated of CURATED_SCIENTIFIC_RECORDS) {
      const recordId = stableCatalogUuid(`record:${curated.key}`);
      const mediaAssetId = stableCatalogUuid(`media:${curated.image}`);
      const state = stateById.get(recordId);
      if (!state) throw new Error(`Curated record ${curated.key} is unavailable.`);

      const attachment = await loadAttachmentState(recordId, mediaAssetId);
      const metadataMatches =
        attachment?.caption === curated.imageCaption &&
        attachment.description === curated.imageDescription &&
        attachment.alt_text === curated.imageAltText;

      let currentStatus = state.status;
      if (!metadataMatches && currentStatus === ScientificRecordStatus.PUBLISHED) {
        await records.unpublish(reviewer.id, recordId);
        currentStatus = ScientificRecordStatus.DRAFT;
      } else if (!metadataMatches && currentStatus === ScientificRecordStatus.IN_REVIEW) {
        await records.requestChanges(reviewer.id, recordId, 'Attachment metadata update required.');
        currentStatus = ScientificRecordStatus.DRAFT;
      }

      if (currentStatus === ScientificRecordStatus.PUBLISHED) continue;

      if (currentStatus === ScientificRecordStatus.DRAFT) {
        await records.upsertTranslation(ownerUserId, recordId, 'en', {
          title: curated.title,
          summary: curated.summary,
          description: curated.description,
          sourceLocale: 'en',
        });
        if (!metadataMatches) {
          await updateAttachmentMetadata(ownerUserId, recordId, mediaAssetId, {
            caption: curated.imageCaption,
            description: curated.imageDescription,
            altText: curated.imageAltText,
          });
        }
        await records.submitForReview(ownerUserId, recordId);
      } else if (currentStatus !== ScientificRecordStatus.IN_REVIEW) {
        throw new Error(
          `Curated record ${curated.key} has unsupported status ${currentStatus}; no change was made to it.`,
        );
      }

      await records.publish(reviewer.id, recordId);
    }

    const finalStates = await loadRecordStates(recordIds);
    const finalPublished = finalStates.filter(
      (record) => record.status === ScientificRecordStatus.PUBLISHED,
    ).length;
    if (finalPublished !== recordIds.length) {
      throw new Error(
        `Publication did not complete: ${finalPublished} of ${recordIds.length} curated records are published.`,
      );
    }
    process.stdout.write(
      `Curated publication complete: ${finalPublished} records are published through normal review checks.\n`,
    );
  } finally {
    await appDataSource.destroy();
  }
}

async function loadRecordStates(recordIds: string[]): Promise<RecordStateRow[]> {
  return appDataSource.query<RecordStateRow[]>(
    `SELECT id, owner_user_id, status
     FROM scientific_records
     WHERE id = ANY($1::uuid[])
     ORDER BY id`,
    [recordIds],
  );
}

async function loadIndependentReviewer(ownerUserId: string): Promise<ReviewerRow> {
  const reviewers = await appDataSource.query<ReviewerRow[]>(
    `SELECT id FROM users
     WHERE status = 'active' AND role IN ('teacher', 'admin') AND id <> $1
     ORDER BY CASE role WHEN 'admin' THEN 0 ELSE 1 END, created_at, id
     LIMIT 1`,
    [ownerUserId],
  );
  if (!reviewers[0]) {
    throw new Error('A second active teacher or admin is required for independent review.');
  }
  return reviewers[0];
}

async function loadReferenceStates(referenceIds: string[]): Promise<ReferenceStateRow[]> {
  return appDataSource.query<ReferenceStateRow[]>(
    `SELECT id
     FROM scientific_references
     WHERE id = ANY($1::uuid[])
     ORDER BY id`,
    [referenceIds],
  );
}

async function loadAttachmentState(
  recordId: string,
  mediaAssetId: string,
): Promise<AttachmentStateRow | undefined> {
  const rows = await appDataSource.query<AttachmentStateRow[]>(
    `SELECT caption, description, alt_text
     FROM record_media
     WHERE record_id = $1 AND media_asset_id = $2`,
    [recordId, mediaAssetId],
  );
  return rows[0];
}

async function updateAttachmentMetadata(
  actorUserId: string,
  recordId: string,
  mediaAssetId: string,
  metadata: { caption: string; description: string; altText: string },
): Promise<void> {
  await appDataSource.transaction(async (manager) => {
    await assertRecordEditable(manager, recordId, { lock: true });
    const owned = await manager.query<Array<{ id: string }>>(
      `SELECT m.id
       FROM record_media rm
       JOIN media_assets m ON m.id = rm.media_asset_id
       WHERE rm.record_id = $1 AND rm.media_asset_id = $2 AND m.owner_user_id = $3
       FOR UPDATE OF rm`,
      [recordId, mediaAssetId, actorUserId],
    );
    if (!owned[0]) {
      throw new Error('The curated primary attachment is unavailable to its record owner.');
    }
    await manager.query(
      `UPDATE record_media
       SET caption = $3, description = $4, alt_text = $5
       WHERE record_id = $1 AND media_asset_id = $2`,
      [recordId, mediaAssetId, metadata.caption, metadata.description, metadata.altText],
    );
    await manager.query(`UPDATE scientific_records SET updated_at = now() WHERE id = $1`, [
      recordId,
    ]);
    await manager.query(
      `INSERT INTO content_audit_events (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'scientific-record.media-updated', 'scientific-record', $2, $3::jsonb)`,
      [actorUserId, recordId, JSON.stringify({ mediaAssetId, curatedCatalogSync: true })],
    );
  });
}

publishCuratedCatalog().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown curated publication failure.';
  process.stderr.write(`Curated publication failed: ${message}\n`);
  process.exitCode = 1;
});
