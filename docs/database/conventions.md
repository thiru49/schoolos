# Database conventions

- Every operational table has `school_id` (schools uses `id` as the tenant key).
- Tenant child FKs are composite: `(child_fk, school_id) REFERENCES parent(id, school_id)`.
- RLS policies are in Prisma migrations, never in seed.
- Do not `prisma db pull` without reviewing SQL FKs on `user_scopes` (`class_id`/`section_id`/`student_id` are optional; Prisma cannot model optional composite FKs with a required `school_id`). Those FKs are MATCH SIMPLE in PostgreSQL.
- Permissions catalog has no `school_id` and no RLS.
- `attendance.status` is CHECK (`P|A|L|H`). `user_scopes.scope_type` is CHECK (`school|class|section|subject|self|children`) plus a shape CHECK so the right target columns are set.
- `subject_id` on `user_scopes` has no `subjects` table yet. Do not invent that module here.
