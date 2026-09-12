-- Tenant integrity: composite (id, school_id) uniqueness + FKs.
-- RLS lives here, not in seed.

-- 1. Join tables get school_id
ALTER TABLE "user_roles" ADD COLUMN "school_id" UUID;
UPDATE "user_roles" ur SET "school_id" = u."school_id" FROM "users" u WHERE u."id" = ur."user_id";
ALTER TABLE "user_roles" ALTER COLUMN "school_id" SET NOT NULL;

ALTER TABLE "user_scopes" ADD COLUMN "school_id" UUID;
UPDATE "user_scopes" us SET "school_id" = u."school_id" FROM "users" u WHERE u."id" = us."user_id";
ALTER TABLE "user_scopes" ALTER COLUMN "school_id" SET NOT NULL;

ALTER TABLE "role_permissions" ADD COLUMN "school_id" UUID;
UPDATE "role_permissions" rp SET "school_id" = r."school_id" FROM "roles" r WHERE r."id" = rp."role_id";
ALTER TABLE "role_permissions" ALTER COLUMN "school_id" SET NOT NULL;

CREATE INDEX "user_roles_school_id_idx" ON "user_roles"("school_id");
CREATE INDEX "user_scopes_school_id_idx" ON "user_scopes"("school_id");
CREATE INDEX "role_permissions_school_id_idx" ON "role_permissions"("school_id");

-- 2. Composite uniqueness so FKs can include school_id
CREATE UNIQUE INDEX "users_id_school_id_key" ON "users"("id", "school_id");
CREATE UNIQUE INDEX "roles_id_school_id_key" ON "roles"("id", "school_id");
CREATE UNIQUE INDEX "academic_years_id_school_id_key" ON "academic_years"("id", "school_id");
CREATE UNIQUE INDEX "classes_id_school_id_key" ON "classes"("id", "school_id");
CREATE UNIQUE INDEX "sections_id_school_id_key" ON "sections"("id", "school_id");
CREATE UNIQUE INDEX "students_id_school_id_key" ON "students"("id", "school_id");
CREATE UNIQUE INDEX "parents_id_school_id_key" ON "parents"("id", "school_id");
CREATE UNIQUE INDEX "teachers_id_school_id_key" ON "teachers"("id", "school_id");

-- 3. Replace single-column intra-tenant FKs with composite FKs
ALTER TABLE "classes" DROP CONSTRAINT "classes_academic_year_id_fkey";
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_school_id_fkey"
  FOREIGN KEY ("academic_year_id", "school_id") REFERENCES "academic_years"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sections" DROP CONSTRAINT "sections_class_id_fkey";
ALTER TABLE "sections" ADD CONSTRAINT "sections_class_id_school_id_fkey"
  FOREIGN KEY ("class_id", "school_id") REFERENCES "classes"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "students" DROP CONSTRAINT "students_user_id_fkey";
ALTER TABLE "students" DROP CONSTRAINT "students_class_id_fkey";
ALTER TABLE "students" DROP CONSTRAINT "students_section_id_fkey";
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_school_id_fkey"
  FOREIGN KEY ("user_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_class_id_school_id_fkey"
  FOREIGN KEY ("class_id", "school_id") REFERENCES "classes"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "students" ADD CONSTRAINT "students_section_id_school_id_fkey"
  FOREIGN KEY ("section_id", "school_id") REFERENCES "sections"("id", "school_id") ON UPDATE CASCADE;

ALTER TABLE "parents" DROP CONSTRAINT "parents_user_id_fkey";
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_school_id_fkey"
  FOREIGN KEY ("user_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "parent_students" DROP CONSTRAINT "parent_students_parent_id_fkey";
ALTER TABLE "parent_students" DROP CONSTRAINT "parent_students_student_id_fkey";
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_parent_id_school_id_fkey"
  FOREIGN KEY ("parent_id", "school_id") REFERENCES "parents"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_student_id_school_id_fkey"
  FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "teachers" DROP CONSTRAINT "teachers_user_id_fkey";
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_school_id_fkey"
  FOREIGN KEY ("user_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attendance" DROP CONSTRAINT "attendance_student_id_fkey";
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_section_id_fkey";
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_marked_by_user_id_fkey";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_school_id_fkey"
  FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_section_id_school_id_fkey"
  FOREIGN KEY ("section_id", "school_id") REFERENCES "sections"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_user_id_school_id_fkey"
  FOREIGN KEY ("marked_by_user_id", "school_id") REFERENCES "users"("id", "school_id") ON UPDATE CASCADE;

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_school_id_fkey"
  FOREIGN KEY ("actor_user_id", "school_id") REFERENCES "users"("id", "school_id") ON UPDATE CASCADE;

ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_school_id_fkey"
  FOREIGN KEY ("user_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_school_id_fkey"
  FOREIGN KEY ("user_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_school_id_fkey"
  FOREIGN KEY ("role_id", "school_id") REFERENCES "roles"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_scopes" DROP CONSTRAINT "user_scopes_user_id_fkey";
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_user_id_school_id_fkey"
  FOREIGN KEY ("user_id", "school_id") REFERENCES "users"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
-- MATCH SIMPLE: NULL class_id/section_id/student_id skips the check; set columns still must match tenant
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_class_id_school_id_fkey"
  FOREIGN KEY ("class_id", "school_id") REFERENCES "classes"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_section_id_school_id_fkey"
  FOREIGN KEY ("section_id", "school_id") REFERENCES "sections"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_student_id_school_id_fkey"
  FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id") ON UPDATE CASCADE;

ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_role_id_fkey";
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_school_id_fkey"
  FOREIGN KEY ("role_id", "school_id") REFERENCES "roles"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Public branding projection (not SETOF schools). EXECUTE for app role only.
DROP FUNCTION IF EXISTS get_school_by_slug(text);

CREATE OR REPLACE FUNCTION get_public_branding(p_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  tagline text,
  location text,
  logo_url text,
  powered_by text,
  receipt_prefix text,
  default_language text,
  attendance_mode text,
  theme jsonb,
  typography jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.slug,
    s.name,
    s.tagline,
    s.location,
    s.logo_url,
    s.powered_by,
    s.receipt_prefix,
    s.default_language,
    s.attendance_mode,
    s.theme,
    s.typography
  FROM schools s
  WHERE s.slug = p_slug;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'schoolos_rls_bypass') THEN
    CREATE ROLE schoolos_rls_bypass BYPASSRLS NOLOGIN;
  END IF;
END $$;

ALTER FUNCTION get_public_branding(text) OWNER TO schoolos_rls_bypass;
GRANT SELECT ON schools TO schoolos_rls_bypass;
REVOKE ALL ON FUNCTION get_public_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_branding(text) TO schoolos;

-- 5. RLS + FORCE + tenant policies (production path = migrate, not seed)
DO $$
DECLARE
  t text;
  col text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schools',
    'users',
    'roles',
    'role_permissions',
    'user_roles',
    'user_scopes',
    'academic_years',
    'classes',
    'sections',
    'students',
    'parents',
    'parent_students',
    'teachers',
    'attendance',
    'audit_logs',
    'refresh_tokens'
  ]
  LOOP
    col := CASE WHEN t = 'schools' THEN 'id' ELSE 'school_id' END;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING (%I = NULLIF(current_setting(''app.school_id'', true), '''')::uuid) WITH CHECK (%I = NULLIF(current_setting(''app.school_id'', true), '''')::uuid)',
      t, col, col
    );
  END LOOP;
END $$;
