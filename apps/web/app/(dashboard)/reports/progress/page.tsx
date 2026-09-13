"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { ReportCardView } from "../../../../features/exams/report-card-view";

export default function ReportCardPage() {
  return (
    <div>
      <AppHeader title="Report card" subtitle="Published marks for the current academic year." />
      <ReportCardView />
    </div>
  );
}
