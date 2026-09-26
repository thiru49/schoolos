# Deployment runbook

Operational steps for **staging** and **production**. Full context (local dev, env vars, mobile) is in [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md).

## Preconditions

- Target environment has Postgres, Redis, and S3-compatible storage provisioned.
- Secrets stored in the platform secret manager (not in git).
- DB application role is **not** a Postgres superuser (RLS). See [tenancy.md](../architecture/tenancy.md).
- `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, and `EXPO_PUBLIC_API_URL` match the deployed URLs for that environment.

## Standard release (API + worker + web)

### 1. Prepare build

On CI or a build machine, from repository root:

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
```

Artifacts: `apps/api/dist`, `apps/worker/dist`, `apps/web/.next`.

### 2. Run migrations

Against the **target** database only:

```bash
DATABASE_URL="<production-or-staging-url>" pnpm db:migrate:deploy
```

Never run `pnpm db:migrate` (interactive dev) on shared environments.

### 3. Deploy API

Environment (minimum): `NODE_ENV=production`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `WEB_ORIGIN`, `MINIO_*` or S3 equivalents, `PLATFORM_OWNER_API_KEY`.

```bash
cd apps/api
node dist/main.js
```

Or use your process manager / container entrypoint with the same command.

### 4. Deploy worker

Same `DATABASE_URL` and `REDIS_URL` as API:

```bash
cd apps/worker
node dist/main.js
```

Run at least one worker instance whenever background jobs are enabled.

### 5. Deploy web

Set at **build time**:

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_DEFAULT_SLUG` (if using a default tenant)

```bash
cd apps/web
pnpm build   # if not built at monorepo root
pnpm start
```

Or deploy `.next` via your Next.js hosting provider.

### 6. Post-deploy smoke tests

- `GET /public/tenants/<slug>/branding` returns 200.
- Web login with a test account (non-demo in production).
- One write/read path per critical module you ship (e.g. attendance, fees).

### 7. Rollback

- **App**: redeploy previous artifact tag; env unchanged.
- **DB**: forward-fix with a new migration; avoid rolling back applied migrations without a DBA plan.

## Mobile release (Expo)

1. Set `EXPO_PUBLIC_API_URL` to the environment API URL.
2. Build with EAS (`eas build`) using profiles for staging vs production.
3. Distribute via internal testing or store submission.
4. Confirm push/deep links if notifications are enabled (`expo-notifications`).

## Monitoring (minimum)

- API process health and HTTP 5xx rate
- Worker queue depth / failed jobs (BullMQ)
- Postgres connections and slow queries
- Object storage errors on upload paths

## Incident contacts

Document on-call and escalation in your org wiki; link backup/restore procedures here when `backup-restore.md` is added.
