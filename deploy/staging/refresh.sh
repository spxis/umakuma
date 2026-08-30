#!/bin/sh
# Refresh the DS1 staging database from Neon production.
#
# Runs nightly from crond (see REFRESH_CRON) and on demand:
#   docker exec umakuma-staging-refresh /usr/local/bin/refresh.sh
#
# Read-only toward Neon: pg_dump only, never a write path. Dump conventions
# match scripts/local-db.mjs — --format=custom, verified with pg_restore --list,
# restored with --clean --if-exists --no-owner --no-privileges.
#
# Secrets: NEON_DIRECT_URL and STAGING_DATABASE_URL are never echoed. All
# captured stderr is scrubbed of connection strings before it reaches the log.
set -eu

DUMP_DIR=/dumps
KEEP="${DUMP_KEEP:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP="${DUMP_DIR}/umakuma-${STAMP}.dump"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*"; }
scrub() { sed -E 's#postgres(ql)?://[^[:space:]]*#<redacted>#g'; }

: "${NEON_DIRECT_URL:?NEON_DIRECT_URL is not set}"
: "${STAGING_DATABASE_URL:?STAGING_DATABASE_URL is not set}"

mkdir -p "$DUMP_DIR"
log "=== staging refresh starting ==="

# --- 1. dump (read-only against production) --------------------------------
log "dump: pg_dump from Neon, custom format"
if ! pg_dump --dbname "$NEON_DIRECT_URL" --format=custom --no-owner --no-privileges \
     --file "$DUMP" 2>/tmp/dump.err; then
  log "dump: FAILED, staging left untouched"
  scrub < /tmp/dump.err | tail -5 | sed 's/^/    /'
  rm -f "$DUMP"
  exit 1
fi
log "dump: wrote $(basename "$DUMP") ($(du -h "$DUMP" | cut -f1))"

# --- 2. verify before touching staging -------------------------------------
if ! pg_restore --list "$DUMP" >/tmp/toc.txt 2>/tmp/list.err; then
  log "verify: FAILED - dump is unreadable, staging left untouched"
  scrub < /tmp/list.err | tail -5 | sed 's/^/    /'
  rm -f "$DUMP"
  exit 1
fi
log "verify: ok, $(grep -c '^[0-9]' /tmp/toc.txt) archive entries"

# --- 3. restore into staging ------------------------------------------------
log "restore: into staging db"
set +e
pg_restore --dbname "$STAGING_DATABASE_URL" --no-owner --no-privileges \
  --clean --if-exists "$DUMP" 2>/tmp/restore.err
rc=$?
set -e
if [ "$rc" -ne 0 ]; then
  # --clean routinely reports "does not exist" on a first load; not fatal.
  log "restore: pg_restore exited $rc (warnings are normal for --clean), tail:"
  scrub < /tmp/restore.err | tail -5 | sed 's/^/    /'
fi

# --- 4. sanity ---------------------------------------------------------------
tables=$(psql --dbname "$STAGING_DATABASE_URL" -At -c \
  "select count(*) from information_schema.tables where table_schema='public'")
log "sanity: $tables tables in public"
if [ "$tables" -eq 0 ]; then
  log "sanity: FAILED - staging has no tables after restore"
  exit 1
fi

# --- 5. prune ----------------------------------------------------------------
log "prune: keeping newest $KEEP dumps"
ls -1t "$DUMP_DIR"/umakuma-*.dump 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  log "prune: removing $(basename "$old")"
  rm -f "$old"
done

log "=== staging refresh done ==="
