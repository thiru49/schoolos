"use client";

import { useParams } from "next/navigation";
import { AppHeader } from "../../../../../components/shell/app-header";
import { ReceiptDetail } from "../../../../../features/fees/receipt-detail";

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  return (
    <div>
      <AppHeader title="Receipt" subtitle="Issued receipt for this school. No gateway." />
      <ReceiptDetail receiptId={params.id} />
    </div>
  );
}
