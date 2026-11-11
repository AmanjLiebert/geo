#!/usr/bin/env sh
set -eu

require_variable() {
  variable_name="$1"
  eval "variable_value=\${$variable_name:-}"
  if [ -z "$variable_value" ]; then
    echo "Required variable $variable_name is not set." >&2
    exit 1
  fi
}

require_variable RESTIC_REPOSITORY
require_variable RESTIC_PASSWORD_FILE
require_variable RESTORE_TEST_DATABASE_URL

restore_database_name="$(psql "$RESTORE_TEST_DATABASE_URL" -Atc 'SELECT current_database()')"
case "$restore_database_name" in
  *_restore_check) ;;
  *)
    echo "Refusing restore: target database must end with _restore_check." >&2
    exit 1
    ;;
esac

restore_directory="$(mktemp -d "${TMPDIR:-/tmp}/geo-kurdistan-restore.XXXXXX")"
cleanup() {
  case "$restore_directory" in
    "${TMPDIR:-/tmp}"/geo-kurdistan-restore.*) rm -r -- "$restore_directory" ;;
    *) echo "Refusing to remove unexpected temporary path: $restore_directory" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

restic restore "${RESTIC_SNAPSHOT_ID:-latest}" \
  --tag geo-kurdistan \
  --target "$restore_directory"

dump_file="$(find "$restore_directory" -type f -name 'geo-kurdistan-*.dump' -print | sort | tail -n 1)"
if [ -z "$dump_file" ]; then
  echo "No PostgreSQL dump was found in the restored snapshot." >&2
  exit 1
fi

checksum_file="$dump_file.sha256"
if [ ! -f "$checksum_file" ]; then
  echo "The restored dump has no checksum file." >&2
  exit 1
fi

(cd "$(dirname "$dump_file")" && sha256sum -c "$(basename "$checksum_file")")

pg_restore \
  --dbname "$RESTORE_TEST_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$dump_file"

psql "$RESTORE_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
SELECT postgis_version();
SELECT key FROM platform_settings ORDER BY key;
SQL

echo "Restore verification succeeded for $restore_database_name."
