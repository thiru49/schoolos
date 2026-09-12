# Tenancy

JWT carries `schoolId`. Mutating queries run inside `PrismaService.withSchool`, which `SET LOCAL app.school_id`. Postgres RLS then filters rows. UI hiding is not a security boundary.

## RLS is a migration

`ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`, and `tenant_isolation` policies are created in:

`database/prisma/migrations/20260912180000_tenant_integrity_and_rls/migration.sql`

`pnpm db:migrate:deploy` applies them. Seed does **not** configure security.

The production database role must **not** be a superuser. Superusers bypass RLS even with FORCE. Local Docker `POSTGRES_USER=schoolos` is a superuser for convenience; isolation tests still cover API + composite FKs.

## Public branding

`GET /public/tenants/:slug/branding` calls `get_public_branding(slug)`, which returns only:

id, slug, name, tagline, location, logo_url, powered_by, receipt_prefix, default_language, attendance_mode, theme, typography

It is `SECURITY DEFINER` owned by `schoolos_rls_bypass`. `PUBLIC` cannot execute it.

## Composite tenant FKs

Child rows cannot point at another school's parent. Example:

```text
students (class_id, school_id) → classes (id, school_id)
students (section_id, school_id) → sections (id, school_id)
```

Same pattern for years, sections, people, attendance, roles, and tokens.
