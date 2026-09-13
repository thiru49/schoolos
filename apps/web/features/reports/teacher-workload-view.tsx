"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
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

type TeacherWorkloadData = {
  summary: {
    totalTeachers: number;
    totalPeriodsScheduled: number;
    averagePeriodsPerTeacher: number;
  };
  teachers: {
    id: string;
    employeeId: string;
    fullName: string;
    assignedSections: string[];
    assignedSubjects: string[];
    weeklyPeriodsCount: number;
  }[];
};

export function TeacherWorkloadView() {
  const { acl } = useAppBranding();
  const isTeacher =
    acl.roles.includes("teacher") &&
    !acl.roles.some((r) =>
      ["school_super_admin", "school_admin", "academic_admin"].includes(r)
    );
  const hasAdminRole = acl.roles.some((r) =>
    ["school_super_admin", "school_admin", "academic_admin"].includes(r)
  );
  const hasSchoolScope = acl.scopes.some((s) => s.type === "school");
  const canAccess =
    !isTeacher &&
    hasAdminRole &&
    hasSchoolScope &&
    acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);

  const [teacherId, setTeacherId] = useState("");
  const [data, setData] = useState<TeacherWorkloadData | null>(null);
  const [state, setState] = useState<"loading" | "loaded" | "empty" | "error" | "offline">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const loadReport = useCallback(async () => {
    if (!canAccess) return;
    setState("loading");
    setErrorMessage("");
    try {
      const res = await api().reports.teacherWorkload({
        teacherId: teacherId || undefined,
      });
      setData(res);
      setState(res.teachers.length === 0 ? "empty" : "loaded");
    } catch (e) {
      if (e instanceof TypeError) {
        setState("offline");
        setErrorMessage("You appear to be offline.");
        return;
      }
      setState("error");
      setErrorMessage(e instanceof Error ? e.message : "Failed to load teacher workload report");
    }
  }, [canAccess, teacherId]);

  useEffect(() => {
    if (canAccess) {
      void loadReport();
    }
  }, [canAccess, loadReport]);

  async function exportCsv() {
    try {
      const url = api().reports.exportTeacherWorkloadUrl({
        teacherId: teacherId || undefined,
      });
      await downloadReportCsv(url, `teacher-workload-${teacherId || "all"}.csv`);
      toast.success("CSV export downloaded successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  if (isTeacher) {
    return <PermissionDenied detail="Teachers are not authorized to view the teacher workload report." />;
  }

  if (!canAccess) {
    return (
      <PermissionDenied detail="Teacher workload report requires administrative role, school scope, and progress reporting permissions." />
    );
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
          title="No faculty records found"
          detail="No teachers or timetable period assignments were found in the current academic year."
        />
      ) : null}

      {state === "loaded" && data ? (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-slate-500">Total Faculty</CardTitle>
              <p className="mt-1 text-xl font-bold text-slate-900">{data.summary.totalTeachers}</p>
              <span className="mt-1 text-[11px] text-slate-400">Active teachers</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-primary">Periods Scheduled</CardTitle>
              <p className="mt-1 text-xl font-bold text-primary">{data.summary.totalPeriodsScheduled}</p>
              <span className="mt-1 text-[11px] text-slate-400">Weekly active timetable slots</span>
            </Card>

            <Card className="p-4 border-slate-200">
              <CardTitle className="text-xs font-medium text-emerald-600">Average Workload</CardTitle>
              <p className="mt-1 text-xl font-bold text-emerald-700">
                {data.summary.averagePeriodsPerTeacher}
              </p>
              <span className="mt-1 text-[11px] text-emerald-600 font-medium">Periods / teacher / week</span>
            </Card>
          </div>

          {/* Teacher Workload Table */}
          <Card className="border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-display text-sm font-semibold text-slate-900">Faculty Period Allocation</h4>
              <span className="text-xs text-slate-400">{data.teachers.length} teachers</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Employee ID</th>
                    <th className="px-4 py-2.5 font-semibold">Teacher Name</th>
                    <th className="px-4 py-2.5 font-semibold">Assigned Subjects</th>
                    <th className="px-4 py-2.5 font-semibold">Assigned Sections</th>
                    <th className="px-4 py-2.5 font-semibold text-center">Weekly Periods</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.teachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono text-slate-500">{teacher.employeeId}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{teacher.fullName}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedSubjects.length > 0 ? (
                            teacher.assignedSubjects.map((sub) => (
                              <Badge key={sub} variant="muted">
                                {sub}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {teacher.assignedSections.length > 0 ? (
                            teacher.assignedSections.map((sec) => (
                              <Badge key={sec} variant="published">
                                {sec}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-800">
                          {teacher.weeklyPeriodsCount}
                        </span>
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
  );
}
