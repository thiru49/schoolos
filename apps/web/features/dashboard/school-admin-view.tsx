"use client";

import Link from "next/link";
import {
  CalendarCheck,
  BookOpen,
  Calendar,
  ClipboardList,
  MessageSquare,
  CalendarDays,
  Sun,
  FileBarChart,
  Banknote,
  GraduationCap,
  UserRound,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Card, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useAppBranding } from "../../lib/branding-context";
import { canAccessFees } from "./dashboard-policy";

export interface SchoolAdminData {
  studentCount: number;
  teacherCount: number;
  sections: { id: string; label: string }[];
}

export function SchoolAdminView({ data }: { data: SchoolAdminData }) {
  const { acl } = useAppBranding();
  const hasFeesPermission = canAccessFees(acl);

  return (
    <div className="space-y-6">
      {/* Daily Snapshot Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Enrolled Students</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">
              {data.studentCount}
            </p>
          </div>
          <Link
            href="/students"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Manage Students <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Teaching Faculty</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">
              {data.teacherCount}
            </p>
          </div>
          <Link
            href="/teachers"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Manage Teachers <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Active Sections</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">
              {data.sections.length}
            </p>
          </div>
          <Link
            href="/classes"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Class & Section Setup <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Today's Attendance</CardTitle>
            <p className="mt-2 text-sm text-slate-600">
              Section rosters & daily registers
            </p>
          </div>
          <Link
            href="/attendance"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            Open Attendance Roster <ArrowRight size={12} />
          </Link>
        </Card>
      </div>

      {/* Operational Modules Grid */}
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-500">
          Academic Operations & Records
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <CalendarCheck size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Attendance Management
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Mark daily attendance (P / A / L / H), view section registers, and export attendance logs.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/attendance" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Open Attendance Roster <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <BookOpen size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Homework & Assignments
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Post class tasks, set submission due dates, and monitor completion rates across subjects.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/homework" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Manage Homework <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Calendar size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Timetable Schedules
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                View weekly period matrices, faculty allocations, and print official classroom timetables.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/timetable" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                View Timetables <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <ClipboardList size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Exams & Grading
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Create term exam schedules, record student subject marks, and publish official report cards.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/exams" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Manage Exams & Marks <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <MessageSquare size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                School Communications
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Broadcast circulars, schedule school events, and announce approved academic holidays.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
              <Link href="/notices" className="font-medium text-primary hover:underline">
                Notices
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/events" className="font-medium text-primary hover:underline">
                Events
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/holidays" className="font-medium text-primary hover:underline">
                Holidays
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <FileBarChart size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Reports Hub
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Generate student rosters, attendance summaries, teacher workloads, and progress tabulation.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/reports" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Open Reports Hub <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          {hasFeesPermission ? (
            <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <Banknote size={18} />
                </div>
                <h4 className="font-display text-sm font-semibold text-slate-900">
                  Fees & Receipts
                </h4>
                <p className="mt-1 text-xs text-slate-500">
                  Record tuition payments, issue official receipts, and audit collection logs.
                </p>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
                <Link href="/fees" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                  Manage Fees <ArrowRight size={12} />
                </Link>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
