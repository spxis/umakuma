# DS1 staging root

Multi-project staging area on DS1, on the same volume Onibako deploys to
(`/volume2/docker`). One directory per tenant; each owns its compose project,
its `.env.staging` (chmod 600, never in a git repo), and its `dumps/`.

Managed from each project's own repo — nothing here is edited by hand.

## Layout

```
/volume2/docker/staging/
├── README.md            <- this file
└── umakuma/             <- tenant
    ├── docker-compose.staging.yml
    ├── refresh.sh
    ├── .env.staging     <- 600, DS1 only
    └── dumps/           <- umakuma-YYYYmmdd-HHMMSS.dump, newest 14 kept
```

## Port table

Published on DS1's LAN/Tailscale interface. Reserved up front so tenants
never collide.

| Port    | Tenant  | Status   |
|---------|---------|----------|
| `55432` | umakuma | in use   |
| `55433` | wazadb  | reserved |
| `55434` | onibako | reserved |

The 554xx range deliberately avoids 5432 so it can never collide with a real
Postgres install on any machine — same convention as UmaKuma's local dev db.

## Tenants

### umakuma

Nightly snapshot of the UmaKuma Neon production database (Postgres 17).

- Deployed by `deploy/staging/deploy-staging-ds1.sh` in the UmaKuma repo.
- Refresh: nightly 03:30 DS1-local, via `crond` in `umakuma-staging-refresh`.
- On demand: `sudo docker exec umakuma-staging-refresh /usr/local/bin/refresh.sh`
- Dumps mirrored to DS15 nightly (see the UmaKuma stack README).

## Conventions for the next tenant

1. Take the next reserved port from the table above.
2. `mkdir /volume2/docker/staging/<tenant>/dumps`.
3. Keep the real env file on DS1 at `<tenant>/.env.staging`, chmod 600,
   generated on DS1 — never committed, never copied between nodes.
4. Name containers `<tenant>-staging-*` so they never collide with Onibako's
   `onibako-ds1-*` containers on the same daemon.
