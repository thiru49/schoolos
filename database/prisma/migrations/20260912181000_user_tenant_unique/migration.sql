CREATE UNIQUE INDEX "students_user_id_school_id_key" ON "students"("user_id", "school_id");
CREATE UNIQUE INDEX "parents_user_id_school_id_key" ON "parents"("user_id", "school_id");
CREATE UNIQUE INDEX "teachers_user_id_school_id_key" ON "teachers"("user_id", "school_id");
