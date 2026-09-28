import { appDataSource } from './data-source';
import { PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from '../identity/access-control';

const foundationSettings = [
  {
    key: 'platform.identity',
    value: { name: 'Geo-Kurdistan' },
  },
  {
    key: 'platform.content_state',
    value: { initializedAsEmpty: true },
  },
  {
    key: 'platform.scientific_content',
    value: {
      schemaVersion: 1,
      geologicalRecordsSeeded: 0,
      structureSource: 'reviewed-migrations',
    },
  },
  {
    key: 'platform.publishing',
    value: {
      schemaVersion: 1,
      referencesSeeded: 0,
      researchPublicationsSeeded: 0,
      mediaAssetsSeeded: 0,
      publicLocationsSeeded: 0,
      newsArticlesSeeded: 0,
      publicationPolicy: 'deny-until-complete',
    },
  },
] as const;

async function seed(): Promise<void> {
  await appDataSource.initialize();

  try {
    await appDataSource.transaction(async (manager) => {
      for (const setting of foundationSettings) {
        await manager.query(
          `
            INSERT INTO "platform_settings" ("key", "value")
            VALUES ($1, $2::jsonb)
            ON CONFLICT ("key") DO UPDATE
              SET "value" = EXCLUDED."value", "updated_at" = now()
          `,
          [setting.key, JSON.stringify(setting.value)],
        );
      }

      for (const permission of PERMISSION_DEFINITIONS) {
        await manager.query(
          `
            INSERT INTO "permissions" ("stable_key", "description", "risk_level")
            VALUES ($1, $2, $3)
            ON CONFLICT ("stable_key") DO UPDATE
              SET "description" = EXCLUDED."description", "risk_level" = EXCLUDED."risk_level"
          `,
          [permission.key, permission.description, permission.riskLevel],
        );
      }

      await manager.query('DELETE FROM "role_permissions"');
      for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
        for (const permission of permissions) {
          await manager.query(
            'INSERT INTO "role_permissions" ("role", "permission_key") VALUES ($1, $2)',
            [role, permission],
          );
        }
      }
    });

    process.stdout.write(
      `Seeded ${foundationSettings.length} configuration setting(s) and the three fixed role bundles.\n`,
    );
  } finally {
    await appDataSource.destroy();
  }
}

void seed().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed failure';
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exitCode = 1;
});
