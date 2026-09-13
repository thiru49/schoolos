"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { Skeleton } from "../../components/ui/skeleton";

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

export function ReceiptDetail({ receiptId }: { receiptId: string }) {
  const { branding, acl } = useAppBranding();
  const canRead = acl.permissions.includes(PERMISSIONS.RECEIPTS_READ);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "denied" | "offline">("loading");
  const [message, setMessage] = useState("");

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

  if (state === "denied") {
    return <PermissionDenied detail={message || "You cannot view this receipt."} />;
  }
  if (state === "offline" || state === "error") {
    return <ErrorState message={message} onRetry={() => void load()} />;
  }
  if (state === "loading") {
    return <Skeleton className="h-40 w-full" />;
  }
  if (state === "empty" || !receipt) {
    return (
      <div>
        <Link href="/fees" className="text-sm text-primary">
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
      <Link href="/fees" className="text-sm text-primary">
        Back to fees
      </Link>
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-400">{branding.schoolName}</p>
        <p className="mt-1 font-display text-2xl font-semibold text-primary">{receipt.number}</p>
        <dl className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Student</dt>
            <dd className="font-medium">
              {receipt.studentName} · {receipt.admissionNumber}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Fee head</dt>
            <dd className="font-medium">{receipt.feeHead}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Amount</dt>
            <dd className="font-medium">₹{receipt.amount}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Method</dt>
            <dd className="font-medium uppercase">{receipt.method}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Recorded</dt>
            <dd className="font-medium">{when}</dd>
          </div>
          {receipt.note ? (
            <div>
              <dt className="text-slate-500">Note</dt>
              <dd className="font-medium">{receipt.note}</dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
