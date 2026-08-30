# UmaKuma staging database (DS1)

A nightly-refreshed snapshot of the Neon production database, hosted on DS1 and
reachable from both Macs over Tailscale. Lets staging work run against realistic
data without touching production.

Sibling of `docker-compose.local.yml` by design: same `postgres:17-alpine`
(matching Neon's major version), same named-volume + `pg_isready` shape, same
55432 convention, and the same dump conventions as `scripts/local-db.mjs`
(`--format=custom`, verified with `pg_restore --list`).

## Files

| File | Role |
|---|---|
| `docker-compose.staging.yml` | `db` (postgres 17) + `refresh` (crond) |
| `refresh.sh` | dump → verify → restore → prune; runs in the `refresh` container |
| `deploy-staging-ds1.sh` | idempotent deploy from a Mac |
| `.env.staging.example` | placeholders only — the real file lives on DS1 |
| `staging-root-README.md` | published to the DS1 staging root as `README.md` |

## Deploy

```sh
./deploy/staging/deploy-staging-ds1.sh            # deploy + bring up
./deploy/staging/deploy-staging-ds1.sh --refresh  # ...and refresh immediately
./deploy/staging/deploy-staging-ds1.sh --status   # report only
```

Idempotent. Host, user, and ssh key are read from the Onibako machines file
(`../onibako/.env.remote`, override with `ONIBAKO_REMOTE_ENV`) so no
infrastructure credentials live in this repo.

## Secrets

Nothing secret is committed. On first deploy the script generates a 40-character
alphanumeric staging password **on DS1** and writes:

```
/volume2/docker/staging/umakuma/.env.staging   (chmod 600)
```

Re-running preserves that password. The Neon `DIRECT_URL` is read from the app's
`.env` and delivered over ssh **stdin** — never as a command argument, never
echoed, never written to a local file. `refresh.sh` scrubs connection strings out
of any captured stderr before logging it.

## Connecting

```
postgresql://umakuma:<password>@<ds1-tailscale-ip>:55432/umakuma
```

Get the password from `.env.staging` on DS1. Point the app at staging with both
`DATABASE_URL` and `DIRECT_URL` set to that string.

## Refresh

Nightly at **03:30 DS1-local**, and on demand:

```sh
sudo docker exec umakuma-staging-refresh /usr/local/bin/refresh.sh
```

Each run: `pg_dump` from Neon (read-only — production is never written), verify
with `pg_restore --list`, restore with `--clean --if-exists --no-owner
--no-privileges`, sanity-check the table count, prune beyond the newest 14.
Staging is only touched **after** the dump verifies, so a bad dump leaves the
last good snapshot in place.

Logs: `dumps/refresh.log`. Dumps: `dumps/umakuma-YYYYmmdd-HHMMSS.dump`,
mirrored nightly to DS15.
