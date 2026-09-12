"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { AttendanceReport } from "../../../../features/attendance/attendance-report";

export default function AttendanceReportPage() {
  return (
    <div>
      <AppHeader title="Attendance report" subtitle="Filter by section and date range." />
      <AttendanceReport />
    </div>
  );
}
