"use client";

import Link from "next/link";
import {
  CalendarRange,
  Users,
  ShieldCheck,
  Settings,
  Banknote,
  FileBarChart,
  ArrowRight,
} from "lucide-react";
import { Card, CardTitle } from "../../components/ui/card";
import { OnboardingPanel } from "../onboarding/onboarding-panel";

export interface SuperAdminData {
  academicYears: { id: string; name: string; isActive: boolean }[];
  classes: { id: string; name: string }[];
  sections: { id: string; label: string }[];
  subjects: { id: string; name: string }[];
  studentCount: number;
  teacherCount: number;
  parentCount: number;
}

export function SuperAdminView({ data }: { data: SuperAdminData }) {
  const activeYear = data.academicYears.find((y) => y.isActive) ?? data.academicYears[0];

  return (
    <div className="space-y-6">
      <OnboardingPanel />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Academic Year</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">
              {activeYear?.name || "None"}
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {data.academicYears.length} {data.academicYears.length === 1 ? "year" : "years"} defined
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Classes & Sections</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">
              {data.classes.length} <span className="text-sm font-normal text-slate-500">classes</span> · {data.sections.length} <span className="text-sm font-normal text-slate-500">sections</span>
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {data.subjects.length} subjects registered
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Enrolled Students</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-primary">
              {data.studentCount}
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {data.parentCount} parent accounts linked
          </p>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <CardTitle>Teaching Faculty</CardTitle>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">
              {data.teacherCount}
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Assigned to section rosters
          </p>
        </Card>
      </div>

      {/* Quick Administrative Management Hub */}
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-500">
          Core Administration Hub
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <CalendarRange size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Academic Masters
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Configure academic years, classes, sections, and subjects structure.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
              <Link href="/academic-years" className="font-medium text-primary hover:underline">
                Years
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/classes" className="font-medium text-primary hover:underline">
                Classes
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/subjects" className="font-medium text-primary hover:underline">
                Subjects
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Users size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                People Directory
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Enroll students, manage faculty profiles, and link parent contacts.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
              <Link href="/students" className="font-medium text-primary hover:underline">
                Students
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/teachers" className="font-medium text-primary hover:underline">
                Teachers
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/parents" className="font-medium text-primary hover:underline">
                Parents
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <ShieldCheck size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Roles & Governance
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Assign administrative roles and manage security scopes for staff.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/roles" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Manage Role Assignments <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Settings size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                School Settings & Branding
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Customize school theme, Tamil typography preset, logo, and receipt numbering prefix.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/settings" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Open Settings Board <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <Banknote size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Fee Management
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Manage fee structures, collection logs, and receipt generation.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/fees" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Open Fees Board <ArrowRight size={12} />
              </Link>
            </div>
          </Card>

          <Card className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow">
            <div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                <FileBarChart size={18} />
              </div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Reports & Archival
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Generate official attendance registers, student progress cards, and fee logs.
              </p>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
              <Link href="/reports" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                View Reports Hub <ArrowRight size={12} />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
