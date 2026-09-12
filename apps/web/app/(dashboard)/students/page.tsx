"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { StudentsBoard } from "../../../features/people/students-board";

export default function StudentsPage() {
  return (
    <div>
      <AppHeader title="Students" subtitle="Directory. Login id is the admission number." />
      <StudentsBoard />
    </div>
  );
}
