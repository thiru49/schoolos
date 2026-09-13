"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw, Layers, UserCheck } from "lucide-react";
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
import { ReportCardView } from "../exams/report-card-view";
import { downloadReportCsv } from "./download-csv";

type Section = { id: string; label: string };
type Exam = { id: string; name: string };

type ProgressReportData = {
  summary: {
    examCount: number;
    studentCount: number;
    averagePercentage: number;
  };
  subjects: string[];
  rows: {
    studentId: string;
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName: string;
    scores: Record<string, number | null>;
    totalScore: number;
    maxScore: number;
    percentage: number;
  }[];
};

export function ProgressReportView() {
  const { acl } = useAppBranding();
  const hasSchoolScope = acl.scopes.some((s) => s.type === "school");
  const canAccess = acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);

  const allowedSectionIds = acl.scopes
    .filter((s) => s.type === "section" && Boolean(s.sectionId))
    .map((s) => s.sectionId as string);

  const [activeTab, setActiveTab] = useState<"tabulation" | "individual">("tabulation");
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [exams, setExams] = useState<Exam[]>([]);
  const [examId, setExamId] = useState("");
  const [data, setData] = useState<ProgressReportData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSections = useCallback(async () => {
    try {
      const list = await api().academics.sections();
      const filtered = hasSchoolScope
        ? list
        : list.filter((s) => allowedSectionIds.includes(s.id));
      setSections(filtered);
      if (!hasSchoolScope && filtered[0]) {
        setSectionId(filtered[0].id);
      }
    } catch {
      // Non-blocking
    }
  }, [hasSchoolScope, allowedSectionIds]);

  const loadExams = useCallback(async () => {
    try {
      const list = await api().exams.list(sectionId ? { sectionId } : undefined);
      setExams(list);
    } catch {
      // Non-blocking
    }
  }, [sectionId]);

  const loadReport = useCallback(async () => {
    if (!canAccess) return;
    setState("loading");
    setErrorMessage("");
    try {
      const res = await api().reports.progress({
        sectionId: sectionId || undefined,
        examId: examId || undefined,
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
      setErrorMessage(e instanceof Error ? e.message : "Failed to load progress report");
    }
  }, [canAccess, sectionId, examId]);

  useEffect(() => {
    if (canAccess) {
      void loadSections();
    }
  }, [canAccess, loadSections]);

  useEffect(() => {
    if (canAccess) {
      void loadExams();
    }
  }, [canAccess, loadExams]);

  useEffect(() => {
    if (canAccess && activeTab === "tabulation") {
      void loadReport();
    }
  }, [canAccess, activeTab, loadReport]);

  async function exportCsv() {
    try {
      const url = api().reports.exportProgressUrl({
        sectionId: sectionId || undefined,
        examId: examId || undefined,
      });
      await downloadReportCsv(url, `progress-tabulation-${sectionId || "all"}.csv`);
      toast.success("CSV export downloaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  if (!canAccess) {
    return <PermissionDenied detail="Progress report requires progress reporting permissions." />;
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} /> Back to Reports Hub
        </Link>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "tabulation"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("tabulation")}
          >
            <Layers size={13} /> Class Tabulation
          </button>
          <button
            type="button"
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "individual"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setActiveTab("individual")}
          >
            <UserCheck size={13} /> Individual Report Card
          </button>
        </div>
      </div>

      {activeTab === "individual" ? (
        <ReportCardView />
      ) : (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
            >
              {hasSchoolScope ? <option value="">All Classes & Sections</option> : null}
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
              value={examId}
              onChange={(e) => setExamId(e.target.value)}
            >
              <option value="">All Published Exams</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
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

          {state === "loading" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
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
              title="No progress data found"
              detail="There are no published exam marks recorded for the selected section and exam."
            />
          ) : null}

          {state === "loaded" && data ? (
            <div className="space-y-6">
              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="p-4 border-slate-200">
                  <CardTitle className="text-xs font-medium text-slate-500">Exams Included</CardTitle>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.examCount}</p>
                  <span className="mt-1 text-[11px] text-slate-400">Published assessments</span>
                </Card>

                <Card className="p-4 border-slate-200">
                  <CardTitle className="text-xs font-medium text-slate-500">Students Evaluated</CardTitle>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.studentCount}</p>
                  <span className="mt-1 text-[11px] text-slate-400">Enrolled cohort</span>
                </Card>

                <Card className="p-4 border-slate-200">
                  <CardTitle className="text-xs font-medium text-primary">Class Average</CardTitle>
                  <p className="mt-1 text-xl font-bold text-primary">{data.summary.averagePercentage}%</p>
                  <span className="mt-1 text-[11px] text-primary/80 font-medium">Overall performance</span>
                </Card>
              </div>

              {/* Dynamic Tabulation Matrix Table */}
              <Card className="border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold text-slate-900">
                    Subject Performance Tabulation
                  </h4>
                  <span className="text-xs text-slate-400">{data.rows.length} students</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Adm #</th>
                        <th className="px-4 py-2.5 font-semibold">Student Name</th>
                        <th className="px-4 py-2.5 font-semibold">Class</th>
                        {data.subjects.map((sub) => (
                          <th key={sub} className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">
                            {sub}
                          </th>
                        ))}
                        <th className="px-3 py-2.5 font-semibold text-right">Total</th>
                        <th className="px-3 py-2.5 font-semibold text-right">Max</th>
                        <th className="px-3 py-2.5 font-semibold text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.rows.map((row) => (
                        <tr key={row.studentId} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-mono text-slate-500">{row.admissionNumber}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-900">{row.studentName}</td>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                            {row.className} - {row.sectionName}
                          </td>
                          {data.subjects.map((sub) => {
                            const score = row.scores[sub];
                            return (
                              <td key={sub} className="px-3 py-2.5 text-center font-mono text-slate-700">
                                {score !== null && score !== undefined ? score : "—"}
                              </td>
                            );
                          })}
                          <td className="px-3 py-2.5 text-right font-medium text-slate-900">{row.totalScore}</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{row.maxScore}</td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              variant={
                                row.percentage >= 75
                                  ? "present"
                                  : row.percentage >= 40
                                  ? "published"
                                  : "absent"
                              }
                            >
                              {row.percentage}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
