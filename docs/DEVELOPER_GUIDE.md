# SchoolOS developer guide

How to run the monorepo locally (API, web, mobile, worker), work in **development** vs **production**, and deploy. For architecture and security details, see `docs/architecture/` and `docs/security/checklist.md`.

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| **Node.js** | `>= 20` (see root `package.json` `engines`) |
| **pnpm** | `9.15.4` (see `packageManager` in root `package.json`) |
| **Docker** | For local Postgres, Redis, and MinIO (`docker-compose.yml`) |
| **Git** | Clone the `schoolos` repo |

Optional for mobile:

- **Expo Go** on a physical device, or Android Studio / Xcode simulators
- **EAS CLI** (`npm i -g eas-cli`) when building store or preview binaries

## Repository layout

```
schoolos/
├── apps/
│   ├── api/       NestJS HTTP API (port 4000)
│   ├── web/       Next.js admin / web app (port 3000)
│   ├── mobile/    React Native + Expo (Expo dev server)
│   └── worker/    BullMQ background jobs (Redis)
├── packages/      Shared types, UI, api-client, validation, etc.
├── database/      Prisma schema, migrations, seed
├── .env           Local secrets (from .env.example — never commit)
└── docker-compose.yml
```

Root scripts use **Turborepo** (`turbo.json`). Shared env is loaded from the **repo root** `.env` (API `ConfigModule` reads `../../.env`).

---

## First-time setup

From the `schoolos` directory:

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

What this does:

1. **`.env`** — local URLs, JWT secrets, MinIO keys, `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` client URLs.
2. **Docker** — Postgres (`localhost:5433`), Redis (`6379`), MinIO (`9000` API, `9001` console).
3. **Prisma** — generates the client, applies migrations (including RLS), seeds the demo tenant `arulneri`.

Verify infrastructure:

```bash
docker compose ps
```

Demo users and passwords are listed in the root [README.md](../README.md).

---

## Starting the stack (development mode)

**Development** means hot reload, local Docker services, and `NODE_ENV=development` in `.env` (default in `.env.example`).

### Run everything (API + web + mobile + worker)

```bash
pnpm dev
```

Turbo runs `dev` in parallel for each app that defines it. This is the usual full-stack loop.

### Run apps individually

Useful when you only need one surface:

````bash
# API (Nest watch mode)
pnpm --filter @schoolos/api dev

# Web (Next.js on port 3000)
pnpm --filter @schoolos/web dev

# Mobile (Expo dev server)
pnpm --filter @schoolos/mobile dev

# Worker (BullMQ consumers)
pnpm --filter @schoolos/worker dev
````

### Default URLs (local)

| Service | URL |
|---------|-----|
| API | http://localhost:4000 |
| Web | http://localhost:3000 |
| Public branding (smoke test) | http://localhost:4000/public/tenants/arulneri/branding |
| MinIO console | http://localhost:9001 (user `schoolos`, password from `.env`) |
| Postgres | `localhost:5433` (host port; container uses 5432) |

### Web ↔ API configuration

- `NEXT_PUBLIC_API_URL` — browser calls to the API (default `http://localhost:4000`).
- `NEXT_PUBLIC_DEFAULT_SLUG` — tenant slug before the user picks a school (default `arulneri`).
- API CORS allows `WEB_ORIGIN` (default `http://localhost:3000`) plus Expo dev origins `http://localhost:8081` and `http://localhost:19006`.

Set `WEB_ORIGIN` in `.env` if the web app runs on another host or port.

### Mobile ↔ API configuration

- `EXPO_PUBLIC_API_URL` — explicit API base URL (recommended when using a **physical device**).
- If unset, the app tries to derive `http://<expo-host>:4000` from the Expo dev server; otherwise it falls back to `http://localhost:4000` (works on simulators only).

**Physical device:** use your machine’s LAN IP, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000
```

Ensure the device and PC are on the same network and that port `4000` is reachable.

After changing `EXPO_PUBLIC_*`, restart the Expo dev server.

### Database commands (development)

| Command | When to use |
|---------|-------------|
| `pnpm db:generate` | After pulling schema changes |
| `pnpm db:migrate` | Local schema changes (`prisma migrate dev`) |
| `pnpm db:seed` | Refresh demo data |
| `pnpm db:studio` | Prisma Studio GUI |

Do **not** use `db:migrate` (dev) in production; use `db:migrate:deploy` instead (see below).

### Quality checks (before PR)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration    # API + Postgres (integration config)
pnpm test:security       # Tenant isolation scripts
```

CI runs typecheck and unit tests on every PR (see `.github/workflows/ci.yml`).

---

## Production mode (runtime behavior)

**Production** means deployed infrastructure, strong secrets, and `NODE_ENV=production`. There is no single “production compose” in this repo yet; you deploy each app and managed services separately.

### Environment model

Blueprint path: `local → development → staging → production`. Use **separate** Postgres, Redis, object storage, and secrets per environment. Commit only `.env.example`; inject real values via your host (Vault, CI secrets, platform env UI).

### Variables that must change for production

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | Local Docker Postgres | Managed Postgres (non-superuser role; see `docs/architecture/tenancy.md`) |
| `REDIS_URL` | `redis://localhost:6379` | Managed Redis |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Placeholder | Cryptographically random, unique per env |
| `PLATFORM_OWNER_API_KEY` | Placeholder | Strong secret, rotation policy |
| `WEB_ORIGIN` | `http://localhost:3000` | Public web origin, e.g. `https://app.yourschool.com` |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Public API URL, e.g. `https://api.yourschool.com` |
| `EXPO_PUBLIC_API_URL` | LAN or localhost | Same public API URL as web clients |
| MinIO (`MINIO_*`) | Local MinIO | S3-compatible bucket (AWS S3, R2, etc.) with matching env names your deployment maps |

Rebuild **web** and **mobile** after changing any `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable; they are baked in at build time.

### Build artifacts

From repo root, after install and Prisma generate:

```bash
pnpm db:generate
pnpm build
```

This builds:

- **API** — `apps/api/dist/` → run with `node dist/main.js` (`pnpm --filter @schoolos/api start`)
- **Web** — Next.js output in `apps/web/.next/` → `pnpm --filter @schoolos/web start` (or platform-native Next deploy)
- **Worker** — `apps/worker/dist/` → `pnpm --filter @schoolos/worker start`

**Mobile** has no root `build` script; production binaries use **Expo Application Services (EAS)** or local `eas build` (configure `eas.json` when you add store distribution).

### Database in production

Always apply migrations with deploy semantics (no interactive dev migrations):

```bash
pnpm db:migrate:deploy
```

Run this **before** or as part of your release job, against the target database. Then run the API/worker with the same `DATABASE_URL`.

Optional: run seed only in non-production demo environments (`pnpm db:seed`); do not seed production with demo passwords.

### Process layout (typical)

At minimum in production:

1. **Postgres** — migrations applied; app DB user is **not** a superuser (RLS).
2. **Redis** — required for BullMQ.
3. **API** — one or more Node processes behind a load balancer / reverse proxy (TLS termination at edge).
4. **Worker** — at least one process consuming the same Redis queues.
5. **Web** — Next.js on Node or a host that supports Next 15.
6. **Object storage** — S3-compatible bucket for uploads (replaces local MinIO).

Health check: `GET` a public route such as `/public/tenants/<slug>/branding` after deploy.

---

## Deployment overview

The repo does not yet ship Dockerfiles or a turnkey PaaS manifest. Use this checklist and map steps to your platform (VPS + systemd, Kubernetes, Railway, Fly.io, AWS, etc.).

### Recommended release flow

```
feature → PR → CI green → staging deploy → QA
  → production deploy → smoke tests → monitor
```

Aligns with `SCHOOL_SAAS_PROJECT_BLUEPRINT.md` §28. MVP pilots may stop at staging until production hardening is complete.

### Staging / production deploy checklist

1. **Provision** managed Postgres, Redis, and object storage; set env vars on the host.
2. **Build** from a tagged commit:
   ```bash
   pnpm install --frozen-lockfile
   pnpm db:generate
   pnpm build
   ```
3. **Migrate**:
   ```bash
   DATABASE_URL="..." pnpm db:migrate:deploy
   ```
4. **Start** API and worker (`start` scripts above); set `PORT` and health checks.
5. **Deploy web** with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DEFAULT_SLUG` set for that environment.
6. **Mobile** (when ready): `eas build` with `EXPO_PUBLIC_API_URL` pointing at staging/production API; distribute via internal track or app stores.
7. **Smoke test** — login, branding, one critical flow (e.g. attendance read) per tenant.
8. **Security** — run `pnpm test:security` against staging when API URL can be targeted by scripts (or run in CI against ephemeral env).

### Web deployment options

- **Node host** — build on CI, run `next start` with `NODE_ENV=production`.
- **Vercel / similar** — set root to `apps/web` or monorepo-aware project; env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEFAULT_SLUG`.
- Ensure the API `WEB_ORIGIN` matches the deployed web origin for CORS and cookies.

### API and worker deployment options

- Run as separate services sharing `DATABASE_URL`, `REDIS_URL`, JWT secrets, and MinIO/S3 settings.
- Scale API horizontally; scale workers by queue depth.
- Put TLS and rate limiting at the reverse proxy where possible.

### Mobile deployment options

- **Development** — `pnpm --filter @schoolos/mobile dev` + Expo Go.
- **Preview / pilot** — EAS internal distribution with production API URL in `EXPO_PUBLIC_API_URL`.
- **Store release** — EAS Build for iOS/Android; configure signing in Expo dashboard.

### What not to deploy from this repo as-is

- Local `docker-compose.yml` Postgres user is a **superuser** for developer convenience only.
- Default JWT and platform keys from `.env.example`.
- Demo seed passwords (`SEED_PASSWORD`) in any shared environment.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| API cannot connect to DB | Confirm Docker is up; `DATABASE_URL` uses port **5433** on host |
| Web CORS errors | Set `WEB_ORIGIN` to the exact web URL (scheme + host + port) |
| Mobile cannot reach API on device | Set `EXPO_PUBLIC_API_URL` to LAN IP; check firewall |
| MinIO upload failures | Use `quay.io/minio/minio` image; verify `MINIO_*` in `.env` |
| RLS seems ignored locally | Expected with Docker superuser; production must use non-superuser role |
| Prisma client out of date | `pnpm db:generate` |

---

## Related docs

- [README.md](../README.md) — demo users and slice scope
- [docs/architecture/tenancy.md](./architecture/tenancy.md) — RLS and production DB role
- [docs/security/checklist.md](./security/checklist.md) — pre-release security
- [docs/runbooks/deployment.md](./runbooks/deployment.md) — condensed production runbook
