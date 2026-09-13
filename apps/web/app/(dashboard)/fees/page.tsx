"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { FeesBoard } from "../../../features/fees/fees-board";
import { useAppBranding } from "../../../lib/branding-context";

export default function FeesPage() {
  const { branding } = useAppBranding();
  return (
    <div>
      <AppHeader
        title="Fees"
        subtitle={`Record cash / UPI / bank. Receipts use ${branding.receiptPrefix}/{n}. No gateway.`}
      />
      <FeesBoard />
    </div>
  );
}
