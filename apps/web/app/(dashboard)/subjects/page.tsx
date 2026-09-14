"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { SubjectsBoard } from "../../../features/academics/subjects-board";

export default function SubjectsPage() {
  return (
    <div>
      <AppHeader
        title="Subjects"
        subtitle="Maintain the school subject catalog used in timetable and exams."
      />
      <SubjectsBoard />
    </div>
  );
}
