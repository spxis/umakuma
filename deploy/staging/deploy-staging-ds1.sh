#!/usr/bin/env bash
# Deploy the UmaKuma staging database stack to DS1. Idempotent — safe to re-run.
#
#   ./deploy/staging/deploy-staging-ds1.sh              # deploy + up
#   ./deploy/staging/deploy-staging-ds1.sh --refresh    # ...then refresh now
#   ./deploy/staging/deploy-staging-ds1.sh --status     # report, change nothing
#
# Host, user, and ssh key come from the Onibako machines file (.env.remote), so
# no infrastructure credentials live in this repo. The Neon connection string is
# read from the app's .env and delivered to DS1 over ssh stdin — it is never
# passed as an argument, never echoed, and never written locally.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STACK_DIR="${REPO_ROOT}/deploy/staging"

# Where the Onibako machines file lives (override with ONIBAKO_REMOTE_ENV).
ONIBAKO_REMOTE_ENV="${ONIBAKO_REMOTE_ENV:-${REPO_ROOT}/../onibako/.env.remote}"
APP_ENV_FILE="${APP_ENV_FILE:-${REPO_ROOT}/.env}"

STAGING_ROOT="${STAGING_ROOT:-/volume2/docker/staging}"
TENANT_DIR="${STAGING_ROOT}/umakuma"

do_refresh=0
do_status=0
for arg in "$@"; do
  case "$arg" in
    --refresh) do_refresh=1 ;;
    --status)  do_status=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

die() { echo "error: $*" >&2; exit 1; }

# --- read a single KEY=value out of a dotenv file, without sourcing it -------
read_env() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 1
  sed -n -E "s/^[[:space:]]*${key}=[\"']?(.*[^\"'])[\"']?[[:space:]]*$/\1/p" "$file" | tail -1
}

[[ -f "$ONIBAKO_REMOTE_ENV" ]] || die "machines file not found: $ONIBAKO_REMOTE_ENV (set ONIBAKO_REMOTE_ENV)"

DS1_HOST="$(read_env "$ONIBAKO_REMOTE_ENV" ONIBAKO_DS1_HOST || true)"
DS1_USER="$(read_env "$ONIBAKO_REMOTE_ENV" ONIBAKO_DS1_USER || true)"
DS1_USER="${DS1_USER:-$(read_env "$ONIBAKO_REMOTE_ENV" ONIBAKO_SSH_USER || true)}"
SSH_KEY="$(read_env "$ONIBAKO_REMOTE_ENV" ONIBAKO_SSH_KEY_PATH || true)"
SSH_KEY="${SSH_KEY/#\$HOME/$HOME}"
SSH_KEY="${SSH_KEY/#\~/$HOME}"

[[ -n "$DS1_HOST" ]] || die "ONIBAKO_DS1_HOST missing from $ONIBAKO_REMOTE_ENV"
[[ -n "$DS1_USER" ]] || die "no ssh user in $ONIBAKO_REMOTE_ENV"
[[ -f "$SSH_KEY"  ]] || die "ssh key not found: $SSH_KEY"

SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 "${DS1_USER}@${DS1_HOST}")
# Synology: docker is root-only, sudo is NOPASSWD for the docker binary.
DOCKER='sudo -n /usr/local/bin/docker'

echo "==> DS1 ${DS1_USER}@${DS1_HOST}, staging root ${STAGING_ROOT}"
"${SSH[@]}" true || die "cannot ssh to DS1"

if (( do_status )); then
  "${SSH[@]}" "$DOCKER compose -f ${TENANT_DIR}/docker-compose.staging.yml --env-file ${TENANT_DIR}/.env.staging ps 2>&1 || true; ls -1t ${TENANT_DIR}/dumps/*.dump 2>/dev/null | head -3"
  exit 0
fi

# --- 1. staging root + tenant layout ----------------------------------------
echo "==> ensuring layout"
"${SSH[@]}" "mkdir -p '${TENANT_DIR}/dumps'"

# --- 2. ship the stack -------------------------------------------------------
echo "==> syncing stack files"
# No --delete of any kind: dumps/ and .env.staging live in this directory on DS1
# and must survive every redeploy. Only the three managed files are pushed.
for f in docker-compose.staging.yml refresh.sh README.md; do
  rsync -az -e "ssh -i ${SSH_KEY} -o BatchMode=yes" \
    "${STACK_DIR}/${f}" "${DS1_USER}@${DS1_HOST}:${TENANT_DIR}/${f}"
done
"${SSH[@]}" "chmod +x '${TENANT_DIR}/refresh.sh'; mkdir -p '${TENANT_DIR}/dumps'"

rsync -az -e "ssh -i ${SSH_KEY} -o BatchMode=yes" \
  "${STACK_DIR}/staging-root-README.md" \
  "${DS1_USER}@${DS1_HOST}:${STAGING_ROOT}/README.md"

# --- 3. the 600-perm env file, created once, refreshed each deploy -----------
echo "==> ensuring ${TENANT_DIR}/.env.staging"
"${SSH[@]}" bash -s <<REMOTE
set -euo pipefail
umask 077
cd '${TENANT_DIR}'
if [ ! -f .env.staging ]; then
  # Alphanumeric so the password needs no URL-encoding in a connection string.
  PW="\$(tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c 40 || openssl rand -hex 20)"
  {
    printf 'POSTGRES_PASSWORD=%s\n' "\$PW"
    printf 'STAGING_DB_PORT=55432\n'
    printf 'REFRESH_CRON=30 3 * * *\n'
    printf 'DUMP_KEEP=14\n'
    printf 'TZ=America/Los_Angeles\n'
    printf 'NEON_DIRECT_URL=\n'
  } > .env.staging
  echo "    created (new staging password generated on DS1)"
else
  echo "    exists, password preserved"
fi
chmod 600 .env.staging
REMOTE

# Deliver the Neon URL over stdin so it never appears in argv or in any log.
NEON_URL="$(read_env "$APP_ENV_FILE" DIRECT_URL || true)"
[[ -n "$NEON_URL" ]] || NEON_URL="$(read_env "$APP_ENV_FILE" DATABASE_URL || true)"
[[ -n "$NEON_URL" ]] || die "no DIRECT_URL or DATABASE_URL in $APP_ENV_FILE"

printf '%s' "$NEON_URL" | "${SSH[@]}" "
  set -eu; umask 077; cd '${TENANT_DIR}'
  URL=\$(cat)
  grep -v '^NEON_DIRECT_URL=' .env.staging > .env.staging.tmp || true
  printf 'NEON_DIRECT_URL=%s\n' \"\$URL\" >> .env.staging.tmp
  mv .env.staging.tmp .env.staging
  chmod 600 .env.staging
"
unset NEON_URL
echo "    Neon URL delivered (value not shown)"

# --- 4. bring the stack up ---------------------------------------------------
echo "==> compose up -d"
"${SSH[@]}" "cd '${TENANT_DIR}' && $DOCKER compose -f docker-compose.staging.yml --env-file .env.staging up -d"

echo "==> waiting for db health"
"${SSH[@]}" "for i in \$(seq 1 40); do
  s=\$($DOCKER inspect -f '{{.State.Health.Status}}' umakuma-staging-db 2>/dev/null || echo none)
  [ \"\$s\" = healthy ] && { echo \"    healthy\"; exit 0; }
  sleep 3
done; echo '    not healthy in time'; exit 1"

if (( do_refresh )); then
  echo "==> running refresh now"
  "${SSH[@]}" "$DOCKER exec umakuma-staging-refresh /usr/local/bin/refresh.sh"
fi

echo "==> done. Staging DATABASE_URL shape:"
echo "    postgresql://umakuma:<password>@${DS1_HOST}:55432/umakuma"
echo "    password: ${TENANT_DIR}/.env.staging on DS1 (POSTGRES_PASSWORD)"
