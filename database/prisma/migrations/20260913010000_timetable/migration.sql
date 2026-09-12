CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subjects_id_school_id_key" ON "subjects"("id", "school_id");
CREATE UNIQUE INDEX "subjects_school_id_name_key" ON "subjects"("school_id", "name");
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "timetable_periods" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "teacher_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "timetable_periods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timetable_periods_id_school_id_key" ON "timetable_periods"("id", "school_id");
CREATE UNIQUE INDEX "timetable_periods_school_id_section_id_weekday_start_time_key"
  ON "timetable_periods"("school_id", "section_id", "weekday", "start_time");
CREATE INDEX "timetable_periods_school_id_section_id_weekday_idx"
  ON "timetable_periods"("school_id", "section_id", "weekday");

ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_weekday_check" CHECK ("weekday" BETWEEN 1 AND 7);
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_time_check" CHECK ("start_time" < "end_time");

ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_class_id_school_id_fkey"
  FOREIGN KEY ("class_id", "school_id") REFERENCES "classes"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_section_id_school_id_fkey"
  FOREIGN KEY ("section_id", "school_id") REFERENCES "sections"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_subject_id_school_id_fkey"
  FOREIGN KEY ("subject_id", "school_id") REFERENCES "subjects"("id", "school_id") ON UPDATE CASCADE;
ALTER TABLE "timetable_periods" ADD CONSTRAINT "timetable_periods_teacher_id_school_id_fkey"
  FOREIGN KEY ("teacher_id", "school_id") REFERENCES "teachers"("id", "school_id") ON UPDATE CASCADE;

ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subjects" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subjects"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);

ALTER TABLE "timetable_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "timetable_periods" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "timetable_periods"
  USING (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid)
  WITH CHECK (school_id = NULLIF(current_setting('app.school_id', true), '')::uuid);
