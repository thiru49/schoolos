"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";
import { downloadReceiptPdf } from "./download-receipt-pdf";

type Receipt = {
  id: string;
  number: string;
  amount: number;
  method: string;
  feeHead: string;
  studentName: string;
  admissionNumber: string;
  createdAt: string;
  note: string | null;
};

export function PaymentMethodBadge({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m === "cash") {
    return <Badge variant="present">CASH</Badge>;
  }
  if (m === "upi") {
    return <Badge variant="published">UPI</Badge>;
  }
  if (m === "bank") {
    return <Badge variant="late">BANK</Badge>;
  }
  return <Badge variant="muted">{method.toUpperCase()}</Badge>;
}

export function ReceiptDetail({ receiptId }: { receiptId: string }) {
  const { branding, acl } = useAppBranding();
  const canRead = acl.permissions.includes(PERMISSIONS.RECEIPTS_READ);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!canRead) {
      setState("denied");
      setMessage("You do not have permission to view receipts.");
      return;
    }
    if (!receiptId) {
      setState("empty");
      return;
    }
    setState("loading");
    setMessage("");
    try {
      const data = await api().fees.receipt(receiptId);
      setReceipt(data);
      setState("loaded");
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setState("denied");
        setMessage(e.message);
        return;
      }
      if (e instanceof ApiError && e.status === 404) {
        setState("empty");
        setMessage("Receipt not found");
        return;
      }
      if (e instanceof TypeError) {
        setState("offline");
        setMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setMessage(e instanceof Error ? e.message : "Failed to load receipt");
    }
  }, [canRead, receiptId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDownload() {
    if (!receipt) return;
    setDownloading(true);
    try {
      await downloadReceiptPdf(receipt.id, receipt.number);
      toast.success("Receipt PDF downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view this receipt."} />;
  }
  if (state === "offline" || state === "error") {
    return <ErrorState message={message} onRetry={() => void load()} />;
  }
  if (state === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-8 w-60" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-28 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }
  if (state === "empty" || !receipt) {
    return (
      <div>
        <Link href="/fees" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to fees
        </Link>
        <div className="mt-6">
          <EmptyState title="Receipt not found" detail="This receipt is missing or is not in this school." />
        </div>
      </div>
    );
  }

  const when = new Date(receipt.createdAt).toLocaleString();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/fees" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to fees
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" />
            Print
          </Button>
          <Button onClick={() => void handleDownload()} disabled={downloading}>
            <Download className="mr-1.5 h-4 w-4" />
            {downloading ? "Downloading…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{branding.schoolName}</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-primary">{receipt.number}</h2>
          </div>
          <div className="flex items-center gap-2">
            <PaymentMethodBadge method={receipt.method} />
            <Badge variant="present">OFFICIAL RECEIPT</Badge>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-medium text-slate-500">Student</dt>
            <dd className="mt-1 font-semibold text-ink">
              {receipt.studentName}
              <span className="ml-2 font-normal text-slate-500">({receipt.admissionNumber})</span>
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-medium text-slate-500">Fee Head</dt>
            <dd className="mt-1 font-semibold text-ink">{receipt.feeHead}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-medium text-slate-500">Amount Paid</dt>
            <dd className="mt-1 font-display text-xl font-bold text-primary">₹{receipt.amount}</dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-medium text-slate-500">Payment Method</dt>
            <dd className="mt-1 flex items-center gap-2">
              <PaymentMethodBadge method={receipt.method} />
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5">
            <dt className="text-xs font-medium text-slate-500">Recorded At</dt>
            <dd className="mt-1 font-medium text-ink">{when}</dd>
          </div>
          {receipt.note ? (
            <div className="rounded-xl bg-slate-50 p-3.5">
              <dt className="text-xs font-medium text-slate-500">Note / Reference</dt>
              <dd className="mt-1 font-medium text-ink">{receipt.note}</dd>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3.5">
              <dt className="text-xs font-medium text-slate-500">Note / Reference</dt>
              <dd className="mt-1 text-slate-400">—</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
