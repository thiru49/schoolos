CREATE TABLE "homeworks" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homeworks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "homeworks_id_school_id_key" ON "homeworks"("id", "school_id");
CREATE INDEX "homeworks_school_id_section_id_due_date_idx" ON "homeworks"("school_id", "section_id", "due_date");

ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_class_id_school_id_fkey"
  FOREIGN KEY ("class_id", "school_id") REFERENCES "classes"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_section_id_school_id_fkey"
  FOREIGN KEY ("section_id", "school_id") REFERENCES "sections"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "homeworks" ADD CONSTRAINT "homeworks_created_by_user_id_school_id_fkey"
  FOREIGN KEY ("created_by_user_id", "school_id") REFERENCES "users"("id", "school_id") ON UPDATE CASCADE;

CREATE TABLE "homework_completions" (
    "school_id" UUID NOT NULL,
    "homework_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_completions_pkey" PRIMARY KEY ("homework_id", "student_id")
);

CREATE INDEX "homework_completions_school_id_idx" ON "homework_completions"("school_id");

ALTER TABLE "homework_completions" ADD CONSTRAINT "homework_completions_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_completions" ADD CONSTRAINT "homework_completions_homework_id_school_id_fkey"
  FOREIGN KEY ("homework_id", "school_id") REFERENCES "homeworks"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homework_completions" ADD CONSTRAINT "homework_completions_student_id_school_id_fkey"
  FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homeworks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "homeworks" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "homeworks"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);

ALTER TABLE "homework_completions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "homework_completions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "homework_completions"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);
