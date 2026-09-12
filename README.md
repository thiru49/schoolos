# SchoolOS

Multi-tenant school SaaS. Implementation follows `SCHOOL_SAAS_PROJECT_BLUEPRINT.md` (latest: Arul Neri Academy demo tenant).

**This commit is the first vertical slice only:** tenant branding, auth + ACL, attendance mark/read, isolation tests. Homework, fees, exams, and the rest of the 56-screen catalogue are not built yet.

## Stack

- Mobile: React Native + Expo
- Web: Next.js + Tailwind (shadcn-style primitives)
- API: NestJS modular monolith
- DB: PostgreSQL 16 + RLS (`app.school_id`)
- Jobs: Redis + BullMQ worker
- Files: MinIO

## Local demo

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm --filter @schoolos/api dev
pnpm --filter @schoolos/web dev
```

Then:

Postgres is mapped to **5433** on the host (5432 was already in use). MinIO image may need `quay.io/minio/minio` — logo upload is optional for the attendance slice.

- API: http://localhost:4000
- Web: http://localhost:3000
- Branding: `GET http://localhost:4000/public/tenants/arulneri/branding`

### Demo users (tenant `arulneri`)

All passwords: `Password123!` (sources did not specify a seed password — see decisions below).

| Identifier | Role |
|---|---|
| `superadmin` | Web super admin |
| `TCH-8A` | Teacher of 8-A |
| `9000000001` | Parent of Arun |
| `AN2021-0001` | Student Arun |

Isolation fixture tenant: `school-b` / teacher `TCH-B`.

```bash
pnpm tsx tests/security/attendance-isolation.ts
pnpm --filter @schoolos/api test
```

## Decisions flagged (sources were silent)

1. **Seed password** — used `Password123!` for local demo only.
2. **Parent login identifier** — seeded as phone `9000000001`. Blueprint specifies admission number for students and employee ID for teachers; parent identifier format is not specified.
3. **School B** — seeded only as the isolation-test fixture required by slice step 8.
4. **`GET /attendance/roster` and `GET /academics/sections`** — named so the slice can load a teacher roster and admin 8-A view. Blueprint names `PUT /attendance` and `GET /attendance?studentId=`.
5. **Default tenant slug** — `EXPO_PUBLIC_DEFAULT_SLUG=arulneri` for first launch. School name still comes from the branding API.

## What is not in this slice

EMIS, Aadhaar, payment gateway, transport, library, microservices, homework, timetable, exams, fees UI, notices.
