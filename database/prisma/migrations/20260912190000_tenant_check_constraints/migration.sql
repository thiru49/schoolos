-- Allowed values from the blueprint. Not free-form strings.

ALTER TABLE "attendance" DROP CONSTRAINT IF EXISTS "attendance_status_allowed";
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_status_allowed"
  CHECK ("status" IN ('P', 'A', 'L', 'H'));

ALTER TABLE "user_scopes" DROP CONSTRAINT IF EXISTS "user_scopes_type_allowed";
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_type_allowed"
  CHECK ("scope_type" IN ('school', 'class', 'section', 'subject', 'self', 'children'));

-- Target columns must match scope_type. subject_id has no subjects table yet (later module).
ALTER TABLE "user_scopes" DROP CONSTRAINT IF EXISTS "user_scopes_type_shape";
ALTER TABLE "user_scopes" ADD CONSTRAINT "user_scopes_type_shape"
  CHECK (
    (
      "scope_type" = 'school'
      AND "class_id" IS NULL AND "section_id" IS NULL AND "subject_id" IS NULL AND "student_id" IS NULL
    ) OR (
      "scope_type" = 'class'
      AND "class_id" IS NOT NULL AND "section_id" IS NULL AND "subject_id" IS NULL AND "student_id" IS NULL
    ) OR (
      "scope_type" = 'section'
      AND "class_id" IS NOT NULL AND "section_id" IS NOT NULL AND "subject_id" IS NULL AND "student_id" IS NULL
    ) OR (
      "scope_type" = 'subject'
      AND "class_id" IS NOT NULL AND "section_id" IS NOT NULL AND "subject_id" IS NOT NULL AND "student_id" IS NULL
    ) OR (
      "scope_type" = 'self'
      AND "student_id" IS NOT NULL AND "class_id" IS NULL AND "section_id" IS NULL AND "subject_id" IS NULL
    ) OR (
      "scope_type" = 'children'
      AND "student_id" IS NOT NULL AND "class_id" IS NULL AND "section_id" IS NULL AND "subject_id" IS NULL
    )
  );
