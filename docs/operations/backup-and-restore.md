# Backup and restore procedure

## Backup

`ops/scripts/backup-postgres.sh` creates a compressed PostgreSQL dump, records its SHA-256 checksum, sends both files to an encrypted restic repository outside the application server, and applies the documented retention policy.

Required environment variables:

- `DATABASE_URL`
- `RESTIC_REPOSITORY`
- `RESTIC_PASSWORD_FILE`
- Provider credentials required by the selected repository

Schedule the script outside the application process. Alert on every missed or failed run. Database backups and irreplaceable private media need separate off-server recovery copies.

## Restore verification

`ops/scripts/verify-postgres-restore.sh` restores a selected snapshot and verifies its checksum before loading it into a disposable database. The script refuses any database whose name does not end with `_restore_check`.

Required environment variables:

- `RESTIC_REPOSITORY`
- `RESTIC_PASSWORD_FILE`
- `RESTORE_TEST_DATABASE_URL`
- Optional `RESTIC_SNAPSHOT_ID`; defaults to `latest`

The check confirms that PostGIS is available and the configuration seed exists. Later phases must extend the verification with record, translation, reference, media, and audit invariants.

Run a restore rehearsal before accepting real data and monthly afterward. Record the duration, snapshot identifier, operator, result, and follow-up work without placing credentials in the report.
