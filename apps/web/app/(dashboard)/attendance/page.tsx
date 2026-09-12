"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { AttendanceBoard } from "../../../features/attendance/attendance-board";

export default function AttendancePage() {
  return (
    <div>
      <AppHeader title="Attendance" subtitle="Teacher and admin view for the assigned section." />
      <AttendanceBoard />
    </div>
  );
}
