"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { EventsBoard } from "../../../features/communications/events-board";

export default function EventsPage() {
  return (
    <div>
      <AppHeader
        title="School Events"
        subtitle="Schedule and track academic activities, sports meets, and school-wide events."
      />
      <EventsBoard />
    </div>
  );
}
