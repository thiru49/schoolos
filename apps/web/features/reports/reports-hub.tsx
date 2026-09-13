"use client";

import Link from "next/link";
import {
  CalendarCheck,
  ClipboardList,
  Banknote,
  Receipt,
  GraduationCap,
  UserRound,
  ArrowRight,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { PERMISSIONS } from "@schoolos/permissions";
import { useAppBranding } from "../../lib/branding-context";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { PermissionDenied } from "../../components/states/permission-denied";
import { api } from "../../lib/api";
import { downloadReportCsv } from "./download-csv";
import { toast } from "sonner";

export function ReportsHub() {
  const { branding, acl } = useAppBranding();

  const hasSchoolScope = acl.scopes.some((s) => s.type === "school");
  const canAttendance = acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE);
  const canProgress = acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);
  const canFees = acl.permissions.includes(PERMISSIONS.REPORTS_FEES) && hasSchoolScope;
  const isTeacher =
    acl.roles.includes("teacher") &&
    !acl.roles.some((r) =>
      ["school_super_admin", "school_admin", "academic_admin"].includes(r)
    );
  const hasAdminRole = acl.roles.some((r) =>
    ["school_super_admin", "school_admin", "academic_admin"].includes(r)
  );
  const canTeacherWorkload =
    !isTeacher && hasAdminRole && canProgress && hasSchoolScope;
  const canStudentList = canProgress;

  // If user has none of the report permissions, show permission denied
  if (!canAttendance && !canProgress && !canFees) {
    return <PermissionDenied detail="You do not have access to view school reports." />;
  }

  const reports = [
    {
      id: "attendance",
      title: "Attendance Report",
      subtitle: "Daily and monthly student attendance records by class and section",
      tag: "P / A / L / H summary",
      icon: CalendarCheck,
      href: "/reports/attendance",
      visible: canAttendance,
    },
    {
      id: "progress",
      title: "Student Progress",
      subtitle: "Comprehensive marksheets and class tabulation across subjects",
      tag: "Exam scores & rankings",
      icon: ClipboardList,
      href: "/reports/progress",
      visible: canProgress,
    },
    {
      id: "fee-collection",
      title: "Fee Collection",
      subtitle: "Fee collection performance, head-wise breakdown, and student dues",
      tag: "Collection rate & dues",
      icon: Banknote,
      href: "/reports/fee-collection",
      visible: canFees,
    },
    {
      id: "payments",
      title: "Payment Report",
      subtitle: "Detailed transaction log with payment methods and receipts",
      tag: "Cash · UPI · Bank breakdown",
      icon: Receipt,
      href: "/reports/payments",
      visible: canFees,
    },
    {
      id: "students",
      title: "Student List",
      subtitle: "Official enrollment records, class roster, and contact information",
      tag: "Active / inactive roster",
      icon: GraduationCap,
      href: "/reports/students",
      visible: canStudentList,
    },
    {
      id: "teachers",
      title: "Teacher Workload",
      subtitle: "Weekly period allocation, subject assignment, and faculty distribution",
      tag: "Period schedule & load",
      icon: UserRound,
      href: "/reports/teachers",
      visible: canTeacherWorkload,
    },
  ];

  const visibleReports = reports.filter((r) => r.visible);

  async function quickDownload(url: string, filename: string) {
    try {
      await downloadReportCsv(url, filename);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error(`Failed to export ${filename}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Tamil and English Subheader matching Mockup Page 54 */}
      <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
        <p className="text-sm font-medium text-slate-600">
          {branding.schoolName} · <span className="font-tamil text-primary" lang="ta">அறிக்கைகள்</span>
        </p>
        <span className="text-xs text-slate-400">
          {visibleReports.length} {visibleReports.length === 1 ? "report" : "reports"} available
        </span>
      </div>

      {/* 3x2 Grid of Report Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id} className="flex flex-col justify-between border-slate-200 transition-shadow hover:shadow-md">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={20} />
                  </span>
                  <Badge variant="muted">{report.tag}</Badge>
                </div>
                <h3 className="mt-4 font-display text-base font-semibold text-slate-900">{report.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{report.subtitle}</p>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100">
                <Link
                  href={report.href}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Generate Report <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Export Options Panel */}
      <Card className="border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet size={18} className="text-primary" />
          <CardTitle className="text-slate-800 font-semibold">Quick CSV Export Options</CardTitle>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Directly download current tenant datasets in CSV format for spreadsheet analysis and archival.
        </p>
        <div className="flex flex-wrap gap-2.5">
          {canFees ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs gap-1.5 bg-white shadow-none border border-slate-200 hover:bg-slate-50"
                onClick={() => void quickDownload(api().reports.exportFeeCollectionUrl(), "fee-collection.csv")}
              >
                <Download size={13} /> Fee Collection CSV
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs gap-1.5 bg-white shadow-none border border-slate-200 hover:bg-slate-50"
                onClick={() => void quickDownload(api().reports.exportPaymentsUrl(), "payments-log.csv")}
              >
                <Download size={13} /> Payment Log CSV
              </Button>
            </>
          ) : null}
          {canStudentList ? (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs gap-1.5 bg-white shadow-none border border-slate-200 hover:bg-slate-50"
              onClick={() => void quickDownload(api().reports.exportStudentsUrl(), "student-roster.csv")}
            >
              <Download size={13} /> Student Roster CSV
            </Button>
          ) : null}
          {canTeacherWorkload ? (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs gap-1.5 bg-white shadow-none border border-slate-200 hover:bg-slate-50"
              onClick={() => void quickDownload(api().reports.exportTeacherWorkloadUrl(), "teacher-workload.csv")}
            >
              <Download size={13} /> Teacher Workload CSV
            </Button>
          ) : null}
          {canProgress ? (
            <Button
              variant="secondary"
              size="sm"
              className="text-xs gap-1.5 bg-white shadow-none border border-slate-200 hover:bg-slate-50"
              onClick={() => void quickDownload(api().reports.exportProgressUrl(), "progress-tabulation.csv")}
            >
              <Download size={13} /> Progress Tabulation CSV
            </Button>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
