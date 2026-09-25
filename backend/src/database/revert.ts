import { appDataSource } from './data-source';

async function revert(): Promise<void> {
  await appDataSource.initialize();

  try {
    await appDataSource.undoLastMigration({ transaction: 'all' });
    process.stdout.write('Reverted the latest migration.\n');
  } finally {
    await appDataSource.destroy();
  }
}

void revert().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown migration revert failure';
  process.stderr.write(`Migration revert failed: ${message}\n`);
  process.exitCode = 1;
});
