"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { ProgressReportView } from "../../../../features/reports/progress-report-view";

export default function ProgressReportPage() {
  return (
    <div>
      <AppHeader
        title="Student Progress Report"
        subtitle="Cross-subject marksheet tabulation, grade distribution, and individual student report cards"
      />
      <ProgressReportView />
    </div>
  );
}
