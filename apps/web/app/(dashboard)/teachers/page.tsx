"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { TeachersBoard } from "../../../features/people/teachers-board";

export default function TeachersPage() {
  return (
    <div>
      <AppHeader title="Teachers" subtitle="Staff directory. Login id is the employee ID." />
      <TeachersBoard />
    </div>
  );
}
