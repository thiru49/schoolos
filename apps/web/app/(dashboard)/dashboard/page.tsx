"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { DashboardView } from "../../../features/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <div>
      <AppHeader title="Dashboard" subtitle="Overview of school operations in this slice." />
      <DashboardView />
    </div>
  );
}
