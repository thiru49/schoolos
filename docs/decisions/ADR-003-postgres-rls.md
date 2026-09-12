# ADR-003 PostgreSQL RLS

Status: accepted (blueprint locked)

Every operational table is isolated by `school_id = current_setting('app.school_id')`. Public branding uses `get_school_by_slug` (SECURITY DEFINER).
