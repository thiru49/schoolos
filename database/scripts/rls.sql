-- Canonical copy of public branding + RLS notes.
-- Applied by: database/prisma/migrations/20260912180000_tenant_integrity_and_rls/migration.sql
-- Do not enable RLS from seed.

-- get_public_branding(p_slug) returns only public branding columns (not SETOF schools).
-- EXECUTE is granted to the app role `schoolos`, not PUBLIC.
-- Function owner is schoolos_rls_bypass (BYPASSRLS) so FORCE RLS on schools does not hide branding.
