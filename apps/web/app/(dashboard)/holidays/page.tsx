"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { HolidaysBoard } from "../../../features/communications/holidays-board";

export default function HolidaysPage() {
  return (
    <div>
      <AppHeader
        title="School Holidays"
        subtitle="Manage official school holidays, term breaks, and academic year observances."
      />
      <HolidaysBoard />
    </div>
  );
}
