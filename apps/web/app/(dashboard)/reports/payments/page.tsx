"use client";

import { AppHeader } from "../../../../components/shell/app-header";
import { PaymentsReportView } from "../../../../features/reports/payments-report-view";

export default function PaymentsReportPage() {
  return (
    <div>
      <AppHeader
        title="Payment Report"
        subtitle="Audit transaction receipts, settlement methods, and collections across date ranges"
      />
      <PaymentsReportView />
    </div>
  );
}
