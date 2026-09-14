"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { DashboardView } from "../../../features/dashboard/dashboard-view";

export default function DashboardPage() {
  return (
    <div>
      <AppHeader title="Dashboard" subtitle="Operational overview and daily school administration." />
      <DashboardView />
    </div>
  );
}
