"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { ReportsHub } from "../../../features/reports/reports-hub";

export default function ReportsHubPage() {
  return (
    <div>
      <AppHeader
        title="Reports Hub"
        subtitle="Access comprehensive academic, financial, and operational reports"
      />
      <ReportsHub />
    </div>
  );
}
