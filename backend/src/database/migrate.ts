import { appDataSource } from './data-source';

async function migrate(): Promise<void> {
  await appDataSource.initialize();

  try {
    const migrations = await appDataSource.runMigrations({ transaction: 'all' });
    process.stdout.write(`Applied ${migrations.length} migration(s).\n`);
  } finally {
    await appDataSource.destroy();
  }
}

void migrate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration failure';
  process.stderr.write(`Migration failed: ${message}\n`);
  process.exitCode = 1;
});
