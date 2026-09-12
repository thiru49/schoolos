CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "exam_date" DATE NOT NULL,
    "max_score" INTEGER NOT NULL,
    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "exams_id_school_id_key" ON "exams"("id", "school_id");
CREATE INDEX "exams_school_id_section_id_idx" ON "exams"("school_id", "section_id");
ALTER TABLE "exams" ADD CONSTRAINT "exams_max_score_check" CHECK ("max_score" > 0);

ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_id_school_id_fkey"
  FOREIGN KEY ("class_id", "school_id") REFERENCES "classes"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_section_id_school_id_fkey"
  FOREIGN KEY ("section_id", "school_id") REFERENCES "sections"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "exams" ADD CONSTRAINT "exams_subject_id_school_id_fkey"
  FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON UPDATE CASCADE;

CREATE TABLE "marks" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "updated_by_user_id" UUID NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marks_id_school_id_key" ON "marks"("id", "school_id");
CREATE UNIQUE INDEX "marks_school_id_exam_id_student_id_key" ON "marks"("school_id", "exam_id", "student_id");
CREATE INDEX "marks_school_id_exam_id_status_idx" ON "marks"("school_id", "exam_id", "status");
ALTER TABLE "marks" ADD CONSTRAINT "marks_status_check" CHECK ("status" IN ('draft', 'submitted', 'published'));
ALTER TABLE "marks" ADD CONSTRAINT "marks_score_check" CHECK ("score" >= 0);

ALTER TABLE "marks" ADD CONSTRAINT "marks_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marks" ADD CONSTRAINT "marks_exam_id_school_id_fkey"
  FOREIGN KEY ("exam_id", "school_id") REFERENCES "exams"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marks" ADD CONSTRAINT "marks_student_id_school_id_fkey"
  FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "exams" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "exams"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);

ALTER TABLE "marks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marks" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "marks"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);
