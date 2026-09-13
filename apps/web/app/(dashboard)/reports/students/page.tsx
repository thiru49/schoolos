"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { StudentListView } from "../../../../features/reports/student-list-view";

export default function StudentListPage() {
  return (
    <div>
      <AppHeader
        title="Student List Report"
        subtitle="Official enrollment records, class rosters, and parent contact information"
      />
      <StudentListView />
    </div>
  );
}
