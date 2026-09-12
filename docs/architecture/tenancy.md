# Tenancy

JWT carries `schoolId`. Each mutating query runs inside `PrismaService.withSchool`, which `SET LOCAL app.school_id`. Postgres RLS enforces the row set. UI hiding is not a security boundary.
