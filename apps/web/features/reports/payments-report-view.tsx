"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { canAccessFees } from "./reports-policy";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { todayIso } from "../../lib/utils";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../../components/ui/button";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/states/empty-state";
import { ErrorState } from "../../components/states/error-state";
import { PermissionDenied } from "../../components/states/permission-denied";
import { downloadReportCsv } from "./download-csv";

type Section = { id: string; label: string };

type PaymentsReportData = {
  summary: {
    transactionCount: number;
    totalAmount: number;
    cashTotal: number;
    upiTotal: number;
    bankTotal: number;
    from: string | null;
    to: string | null;
  };
  transactions: {
    id: string;
    receiptNumber: string;
    date: string;
    createdAt: string;
    studentId: string;
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName: string;
    feeHeadName: string;
    amount: number;
    method: string;
    note: string | null;
    recordedByName: string;
  }[];
};

function monthStart() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function PaymentsReportView() {
  const { acl } = useAppBranding();
  const canAccess = canAccessFees(acl);

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayIso());
  const [method, setMethod] = useState<"cash" | "upi" | "bank" | "ALL">("ALL");
  const [data, setData] = useState<PaymentsReportData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSections = useCallback(async () => {
    try {
      const list = await api().academics.sections();
      setSections(list);
    } catch {
      // Non-blocking
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (!canAccess) return;
    if (from && to && from > to) {
      toast.error("From date cannot be after To date");
      return;
    }
    setState("loading");
    setErrorMessage("");
    try {
      const res = await api().reports.payments({
        from: from || undefined,
        to: to || undefined,
        method: method === "ALL" ? undefined : method,
        sectionId: sectionId || undefined,
      });
      setData(res);
      setState(res.transactions.length === 0 ? "empty" : "loaded");
    } catch (e) {
      if (e instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to load payment report");
    }
  }, [canAccess, from, to, method, sectionId]);

  useEffect(() => {
    if (canAccess) {
      void loadSections();
      void loadReport();
    }
  }, [canAccess, loadSections, loadReport]);

  async function exportCsv() {
    try {
      const url = api().reports.exportPaymentsUrl({
        from: from || undefined,
        to: to || undefined,
        method: method === "ALL" ? undefined : method,
        sectionId: sectionId || undefined,
      });
      await downloadReportCsv(url, `payments-report-${from}-to-${to}.csv`);
      toast.success("CSV export downloaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  if (!canAccess) {
    return <PermissionDenied detail="Payment reports require school scope and fee reporting permissions." />;
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Reports Hub
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>From:</span>
            <input
              type="date"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>To:</span>
            <input
              type="date"
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as "cash" | "upi" | "bank" | "ALL")}
          >
            <option value="ALL">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank Transfer</option>
          </select>
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            <option value="">All Classes & Sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => void loadReport()}
          >
            <RefreshCw size={13} /> Filter
          </Button>

          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs"
            onClick={() => void exportCsv()}
            disabled={state === "loading" || state === "empty"}
          >
            <Download size={13} /> Export CSV
          </Button>
        </div>
      </div>

      {state === "loading" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : null}

      {state === "offline" || state === "error" ? (
        <ErrorState message={errorMessage} onRetry={() => void loadReport()} />
      ) : null}

      {state === "empty" ? (
        <EmptyState
          title="No payment transactions found"
          detail="There are no payment transactions matching the selected date range and filter criteria."
        />
      ) : null}

      {state === "loaded" && data ? (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-slate-500">Transactions</CardTitle>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {data.summary.transactionCount}
              </p>
              <span className="mt-1 text-[11px] text-slate-400">Total processed</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-emerald-600">Total Collected</CardTitle>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                ₹{data.summary.totalAmount.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-emerald-600 font-medium">All payment methods</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-amber-600">Cash Total</CardTitle>
              <p className="mt-1 text-xl font-bold text-amber-700">
                ₹{data.summary.cashTotal.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-slate-400">Counter receipts</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-sky-600">UPI Total</CardTitle>
              <p className="mt-1 text-xl font-bold text-sky-700">
                ₹{data.summary.upiTotal.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-slate-400">Digital / QR</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-indigo-600">Bank / Transfer</CardTitle>
              <p className="mt-1 text-xl font-bold text-indigo-700">
                ₹{data.summary.bankTotal.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-slate-400">NEFT / Cheque / DD</span>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-display text-sm font-semibold text-slate-900">Transaction Receipts Log</h4>
              <span className="text-xs text-slate-400">{data.transactions.length} receipts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Receipt #</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                    <th className="px-4 py-2.5 font-semibold">Student Name</th>
                    <th className="px-4 py-2.5 font-semibold">Class</th>
                    <th className="px-4 py-2.5 font-semibold">Fee Head</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Method</th>
                    <th className="px-4 py-2.5 font-semibold">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono font-medium text-primary">{tx.receiptNumber}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {tx.studentName}
                        <span className="block font-mono text-[10px] text-slate-400">{tx.admissionNumber}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{tx.className} - {tx.sectionName}</td>
                      <td className="px-4 py-2.5 text-slate-700">{tx.feeHeadName}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-emerald-700">₹{tx.amount.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={tx.method === "CASH" ? "late" : tx.method === "UPI" ? "published" : "muted"}>
                          {tx.method.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{tx.recordedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
