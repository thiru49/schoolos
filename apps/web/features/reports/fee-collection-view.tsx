"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { ApiError } from "@schoolos/api-client";
import { PERMISSIONS } from "@schoolos/permissions";
import { toast } from "sonner";
import { api } from "../../lib/api";
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

type FeeReportData = {
  summary: {
    studentCount: number;
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
    collectionRate: number;
  };
  feeHeadsBreakdown: {
    id: string;
    name: string;
    amountPerStudent: number;
    totalExpected: number;
    totalCollected: number;
    totalOutstanding: number;
  }[];
  rows: {
    studentId: string;
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName: string;
    totalExpected: number;
    totalPaid: number;
    balanceDue: number;
    status: string;
  }[];
};

export function FeeCollectionView() {
  const { acl } = useAppBranding();
  const hasSchoolScope = acl.scopes.some((s) => s.type === "school");
  const canAccess = acl.permissions.includes(PERMISSIONS.REPORTS_FEES) && hasSchoolScope;

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [data, setData] = useState<FeeReportData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSections = useCallback(async () => {
    try {
      const list = await api().academics.sections();
      setSections(list);
    } catch {
      // Non-blocking, fallback to all sections
    }
  }, []);

  const loadReport = useCallback(async () => {
    if (!canAccess) return;
    setState("loading");
    setErrorMessage("");
    try {
      const res = await api().reports.feeCollection({
        sectionId: sectionId || undefined,
      });
      setData(res);
      setState(res.rows.length === 0 ? "empty" : "loaded");
    } catch (e) {
      if (e instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to load fee collection report");
    }
  }, [canAccess, sectionId]);

  useEffect(() => {
    if (canAccess) {
      void loadSections();
      void loadReport();
    }
  }, [canAccess, loadSections, loadReport]);

  async function exportCsv() {
    try {
      const url = api().reports.exportFeeCollectionUrl({
        sectionId: sectionId || undefined,
      });
      await downloadReportCsv(url, `fee-collection-${sectionId || "all"}.csv`);
      toast.success("CSV export downloaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  if (!canAccess) {
    return <PermissionDenied detail="Fee reports require school scope and fee reporting permissions." />;
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Reports Hub
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
            <RefreshCw size={13} /> Refresh
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
          title="No fee records found"
          detail="There are no students or fee collection records matching the selected filter."
        />
      ) : null}

      {state === "loaded" && data ? (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-slate-500">Total Expected</CardTitle>
              <p className="mt-1 text-xl font-bold text-slate-900">
                ₹{data.summary.totalExpected.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-slate-400">{data.summary.studentCount} students</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-emerald-600">Total Collected</CardTitle>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                ₹{data.summary.totalCollected.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-emerald-600 font-medium">
                {data.summary.collectionRate}% collected
              </span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-red-600">Total Outstanding</CardTitle>
              <p className="mt-1 text-xl font-bold text-red-700">
                ₹{data.summary.totalOutstanding.toLocaleString("en-IN")}
              </p>
              <span className="mt-1 text-[11px] text-red-500 font-medium">
                {(100 - data.summary.collectionRate).toFixed(1)}% remaining
              </span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-primary">Collection Rate</CardTitle>
              <p className="mt-1 text-xl font-bold text-primary">{data.summary.collectionRate}%</p>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, data.summary.collectionRate))}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Fee Heads Breakdown */}
          {data.feeHeadsBreakdown.length > 0 ? (
            <Card className="border-slate-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h4 className="font-display text-sm font-semibold text-slate-900">Fee Heads Breakdown</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Fee Head</th>
                      <th className="px-4 py-2.5 font-semibold">Amount / Student</th>
                      <th className="px-4 py-2.5 font-semibold">Expected</th>
                      <th className="px-4 py-2.5 font-semibold">Collected</th>
                      <th className="px-4 py-2.5 font-semibold">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.feeHeadsBreakdown.map((head) => (
                      <tr key={head.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-medium text-slate-900">{head.name}</td>
                        <td className="px-4 py-2.5 text-slate-600">₹{head.amountPerStudent.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-slate-700">₹{head.totalExpected.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 font-medium text-emerald-700">₹{head.totalCollected.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 font-medium text-red-600">₹{head.totalOutstanding.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {/* Student Dues Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-display text-sm font-semibold text-slate-900">Student Dues & Payment Status</h4>
              <span className="text-xs text-slate-400">{data.rows.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Admission #</th>
                    <th className="px-4 py-2.5 font-semibold">Student Name</th>
                    <th className="px-4 py-2.5 font-semibold">Class & Section</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Expected</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Balance Due</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((row) => {
                    const statusVariant =
                      row.status === "PAID"
                        ? "present"
                        : row.status === "PARTIAL"
                        ? "late"
                        : "absent";
                    return (
                      <tr key={row.studentId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono text-slate-500">{row.admissionNumber}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.studentName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.className} - {row.sectionName}</td>
                        <td className="px-4 py-2.5 text-right text-slate-700">₹{row.totalExpected.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-emerald-700">₹{row.totalPaid.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-red-600">₹{row.balanceDue.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant={statusVariant}>{row.status}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
