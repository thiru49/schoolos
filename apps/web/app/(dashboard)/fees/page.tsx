"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { FeesBoard } from "../../../features/fees/fees-board";

export default function FeesPage() {
  return (
    <div>
      <AppHeader title="Fees" subtitle="Record cash / UPI / bank. Receipts are school-wide ANA/26-27/n. No gateway." />
      <FeesBoard />
    </div>
  );
}
