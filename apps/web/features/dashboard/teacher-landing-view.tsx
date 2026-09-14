"use client";

import Link from "next/link";
import {
  Smartphone,
  CalendarCheck,
  BookOpen,
  Calendar,
  ClipboardList,
  MessageSquare,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export function TeacherLandingView() {
  const quickLinks = [
    {
      title: "Class Attendance",
      description: "Mark attendance rosters and review student presence",
      href: "/attendance",
      icon: CalendarCheck,
      action: "Open Attendance",
    },
    {
      title: "Homework & Tasks",
      description: "Assign new homework tasks and monitor student submissions",
      href: "/homework",
      icon: BookOpen,
      action: "Manage Homework",
    },
    {
      title: "Class Timetable",
      description: "View weekly period assignments and teaching schedules",
      href: "/timetable",
      icon: Calendar,
      action: "View Timetable",
    },
    {
      title: "Exams & Marks Entry",
      description: "Enter subject scores and exam marks for your assigned sections",
      href: "/exams",
      icon: ClipboardList,
      action: "Enter Marks",
    },
    {
      title: "Notices & Announcements",
      description: "Read school-wide circulars, notices, and staff communications",
      href: "/notices",
      icon: MessageSquare,
      action: "Read Notices",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Mobile-First Orientation Banner */}
      <Card className="border-sky-200 bg-sky-50/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
              <Smartphone size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  SchoolOS Mobile App for Teachers
                </h3>
                <Badge variant="published" className="text-[10px]">
                  Mobile-First
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 max-w-2xl">
                Per the SchoolOS architecture, daily classroom attendance marking, quick section roster lookups,
                and instant broadcast notifications are designed to run smoothly on the <strong>SchoolOS Mobile App</strong>,
                even with spotty rural connectivity.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles size={14} /> Mobile App Enabled
            </span>
          </div>
        </div>
      </Card>

      {/* Desktop Web Quick Links */}
      <div>
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-slate-500">
          Desktop Workspace Tools
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Use the web interface for detailed grading, bulk homework assignments, and timetable review.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Card
                key={item.href}
                className="flex flex-col justify-between border-slate-200 hover:shadow-sm transition-shadow"
              >
                <div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Icon size={18} />
                  </div>
                  <h4 className="font-display text-sm font-semibold text-slate-900">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3 text-xs">
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                  >
                    {item.action} <ArrowRight size={12} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
