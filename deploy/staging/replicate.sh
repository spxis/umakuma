#!/bin/sh
# Mirror staging dumps DS1 -> DS15 over ssh.
#
# Runs nightly from crond (REPLICATE_CRON, after the refresh) and on demand:
#   docker exec umakuma-staging-replicate /usr/local/bin/replicate.sh
#
# Push-only and additive: --ignore-existing means an already-mirrored dump is
# never re-sent or rewritten, and no --delete is used, so DS15 keeps a dump even
# after DS1 prunes it. The key is mounted read-only and is DS1->DS15 only.
set -eu

: "${DS15_HOST:?DS15_HOST is not set}"
: "${DS15_USER:?DS15_USER is not set}"
: "${DS15_PATH:?DS15_PATH is not set}"

KEY=/ssh/ds15_ed25519
log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*"; }

[ -f "$KEY" ] || { log "replicate: key missing at $KEY"; exit 1; }
# A world/group-readable key is refused by ssh; the bind mount can widen perms.
cp "$KEY" /tmp/k && chmod 600 /tmp/k

count=$(ls -1 /dumps/umakuma-*.dump 2>/dev/null | wc -l)
log "replicate: $count dump(s) on DS1 -> ${DS15_USER}@${DS15_HOST}:${DS15_PATH}"

if rsync -a --ignore-existing --stats \
     -e "ssh -i /tmp/k -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15" \
     /dumps/ "${DS15_USER}@${DS15_HOST}:${DS15_PATH}/" 2>&1 | grep -E "Number of regular files transferred|Total transferred file size"; then
  log "replicate: ok"
else
  log "replicate: FAILED"
  rm -f /tmp/k
  exit 1
fi
rm -f /tmp/k
