"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { TeacherWorkloadView } from "../../../../features/reports/teacher-workload-view";

export default function TeacherWorkloadPage() {
  return (
    <div>
      <AppHeader
        title="Teacher Workload Report"
        subtitle="Faculty timetable allocations, assigned subjects, and weekly period schedules"
      />
      <TeacherWorkloadView />
    </div>
  );
}
