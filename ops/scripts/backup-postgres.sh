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

require_variable DATABASE_URL
require_variable RESTIC_REPOSITORY
require_variable RESTIC_PASSWORD_FILE

backup_directory="$(mktemp -d "${TMPDIR:-/tmp}/geo-kurdistan-backup.XXXXXX")"
cleanup() {
  case "$backup_directory" in
    "${TMPDIR:-/tmp}"/geo-kurdistan-backup.*) rm -r -- "$backup_directory" ;;
    *) echo "Refusing to remove unexpected temporary path: $backup_directory" >&2 ;;
  esac
}
trap cleanup EXIT INT TERM

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump_file="$backup_directory/geo-kurdistan-$timestamp.dump"

pg_dump \
  --dbname "$DATABASE_URL" \
  --format custom \
  --compress 9 \
  --no-owner \
  --no-privileges \
  --file "$dump_file"

sha256sum "$dump_file" > "$dump_file.sha256"
restic backup "$dump_file" "$dump_file.sha256" \
  --tag geo-kurdistan \
  --tag postgresql \
  --host "${BACKUP_HOST_NAME:-geo-kurdistan-production}"

restic forget \
  --tag geo-kurdistan \
  --keep-daily 7 \
  --keep-weekly 5 \
  --keep-monthly 12 \
  --prune

echo "Encrypted off-server backup completed at $timestamp."
