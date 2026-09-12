# ADR-003 PostgreSQL RLS

Status: accepted (blueprint locked)

Every operational table is isolated by `school_id = current_setting('app.school_id')`. RLS is applied in Prisma migrations (not seed). Public branding uses `get_public_branding` (projected columns; EXECUTE not granted to PUBLIC).
