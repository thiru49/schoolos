"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { TimetableBoard } from "../../../features/timetable/timetable-board";

export default function TimetablePage() {
  return (
    <div>
      <AppHeader title="Timetable" subtitle="Section grid. Students and parents see published periods only." />
      <TimetableBoard />
    </div>
  );
}
