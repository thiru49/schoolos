"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { canAccessStudentList, hasSchoolScope } from "./reports-policy";
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

type StudentListData = {
  summary: {
    totalStudents: number;
    activeCount: number;
    inactiveCount: number;
  };
  students: {
    id: string;
    admissionNumber: string;
    fullName: string;
    className: string;
    sectionName: string;
    status: string;
    parentName: string | null;
    parentContact: string | null;
  }[];
};

export function StudentListView() {
  const { acl } = useAppBranding();
  const schoolScoped = hasSchoolScope(acl);
  const canAccess = canAccessStudentList(acl);

  const allowedSectionIds = acl.scopes
    .filter((s) => s.type === "section" && Boolean(s.sectionId))
    .map((s) => s.sectionId as string);

  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "ALL">("ALL");
  const [data, setData] = useState<StudentListData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadSections = useCallback(async () => {
    try {
      const list = await api().academics.sections();
      // If teacher without school scope, filter to teacher's sections
      const filtered = schoolScoped
        ? list
        : list.filter((s) => allowedSectionIds.includes(s.id));
      setSections(filtered);
      if (!schoolScoped && filtered[0]) {
        setSectionId(filtered[0].id);
      }
    } catch {
      // Non-blocking
    }
  }, [schoolScoped, allowedSectionIds]);

  const loadReport = useCallback(async () => {
    if (!canAccess) return;
    setState("loading");
    setErrorMessage("");
    try {
      const res = await api().reports.students({
        sectionId: sectionId || undefined,
        status: status === "ALL" ? undefined : status,
      });
      setData(res);
      setState(res.students.length === 0 ? "empty" : "loaded");
    } catch (e) {
      if (e instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to load student list report");
    }
  }, [canAccess, sectionId, status]);

  useEffect(() => {
    if (canAccess) {
      void loadSections();
    }
  }, [canAccess, loadSections]);

  useEffect(() => {
    if (canAccess) {
      void loadReport();
    }
  }, [canAccess, loadReport]);

  async function exportCsv() {
    try {
      const url = api().reports.exportStudentsUrl({
        sectionId: sectionId || undefined,
        status: status === "ALL" ? undefined : status,
      });
      await downloadReportCsv(url, `student-list-${sectionId || "all"}.csv`);
      toast.success("CSV export downloaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  if (!canAccess) {
    return <PermissionDenied detail="Student list report requires reports.progress permission." />;
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
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
          >
            {schoolScoped ? <option value="">All Classes & Sections</option> : null}
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "inactive" | "ALL")}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
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
          title="No students found"
          detail="No students matched the selected section and enrollment status filter."
        />
      ) : null}

      {state === "loaded" && data ? (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-slate-500">Total Enrolled</CardTitle>
              <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.totalStudents}</p>
              <span className="mt-1 text-[11px] text-slate-400">Current cohort</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-emerald-600">Active Students</CardTitle>
              <p className="mt-1 text-xl font-bold text-emerald-700">{data.summary.activeCount}</p>
              <span className="mt-1 text-[11px] text-emerald-600 font-medium">In regular attendance</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-slate-500">Inactive / Withdrawn</CardTitle>
              <p className="mt-1 text-xl font-bold text-slate-600">{data.summary.inactiveCount}</p>
              <span className="mt-1 text-[11px] text-slate-400">Transferred or archived</span>
            </Card>
          </div>

          {/* Student Roster Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-display text-sm font-semibold text-slate-900">Student Enrollment Roster</h4>
              <span className="text-xs text-slate-400">{data.students.length} students</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Admission #</th>
                    <th className="px-4 py-2.5 font-semibold">Full Name</th>
                    <th className="px-4 py-2.5 font-semibold">Class & Section</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Status</th>
                    <th className="px-4 py-2.5 font-semibold">Parent / Guardian</th>
                    <th className="px-4 py-2.5 font-semibold">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono text-slate-500">{student.admissionNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{student.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{student.className} - {student.sectionName}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={student.status === "ACTIVE" ? "present" : "muted"}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{student.parentName || "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-600">{student.parentContact || "—"}</td>
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
