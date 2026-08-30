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

## Connecting from a Mac

One-time per machine, then everything else just works:

```sh
pnpm staging:link      # reads the DS1 password over ssh, stores the URL in .env.local
```

`staging:link` never prints or logs the password — `.env.local` (gitignored,
chmod 600) becomes the only copy on that Mac. Re-run it if the password is ever
rotated.

```sh
pnpm dev:staging       # dev server on :6402 against staging (override STAGING_WEB_PORT)
pnpm staging:psql      # psql shell on staging
pnpm staging:pull      # copy DS1's newest dump into ./backups
pnpm staging:status    # what the DS1 stack is doing
pnpm local:db:restore --from-ds1   # pull that dump, then load it into the local container
```

Port **6402** so a staging server and `pnpm dev:local` (6400) can run side by
side for comparison. `WANIKANI_MOCK=1` is forced on staging: it holds real
accounts with real encrypted tokens, and those must never be spent on live
WaniKani calls.

Staging is writable but **rebuilt nightly at 03:30** — treat anything written to
it as disposable.

### Addresses

`staging:link` stores the LAN address. If it does not answer — a laptop away
from home — the tooling retries the same credentials against the Tailscale
address automatically, so no reconfiguration is needed when travelling. Override
either with `STAGING_SSH_HOST` / `STAGING_TAILNET_HOST`.

> **Tailscale reachability is blocked, and it is not a firewall rule.**
> (An earlier revision of this doc said it was — that was wrong.)
>
> tailscaled on both DS1 and DS15 runs in **userspace-networking mode**: there is
> no `tailscale0` interface, so inbound TCP never reaches host services. That is
> why `tailscale ping` succeeds — it is answered inside tailscaled, over DERP —
> while `ssh:22` and `psql:55432` time out over the tailnet and answer fine on
> the LAN. Nothing in this stack needs to change; `db` already binds
> `0.0.0.0:55432`.
>
> **Restarting the package does not fix it.** The script only adds
> `--tun=userspace-networking` when `/dev/net/tun` is missing, and the device
> exists now, so the flag is already gone from the command line. tailscaled still
> falls back, because `conf/privilege` runs it as the unprivileged `tailscale`
> user while the device is `crw------- root root`:
>
> ```
> wgengine.NewUserspaceEngine(tun "tailscale0") error: tstun.New("tailscale0"): permission denied
> ```
>
> Two fixes, neither automatable from here — sudo on DS1 is NOPASSWD for the
> docker binary only:
>
> - **No root, database only.** `tailscale serve --bg --tcp 55432
>   tcp://127.0.0.1:55432` on DS1. Userspace mode can still accept inbound and
>   proxy it, which puts staging on the tailnet address this tooling already
>   falls back to. Persists across reboots in tailscaled's own state.
> - **Root, everything.** `chmod 0666 /dev/net/tun && synopkg restart Tailscale`,
>   plus a boot-up task reapplying both, or it reverts on every reboot.

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
