"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { NoticesBoard } from "../../../features/communications/notices-board";

export default function NoticesPage() {
  return (
    <div>
      <AppHeader
        title="Notices & Announcements"
        subtitle="Publish announcements to students, parents, and teachers."
      />
      <NoticesBoard />
    </div>
  );
}
