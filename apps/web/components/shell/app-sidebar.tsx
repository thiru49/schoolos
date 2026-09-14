"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  BookOpen,
  Banknote,
  ClipboardList,
  FileBarChart,
  GraduationCap,
  LayoutDashboard,
  Layers,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserRound,
} from "lucide-react";
import { PERMISSIONS } from "@schoolos/permissions";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { clearSession } from "../../lib/session";
import { cn } from "../../lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/academic-years", label: "Academic Years", icon: CalendarRange, permission: PERMISSIONS.ACADEMIC_YEAR_MANAGE },
  { href: "/classes", label: "Classes & Sections", icon: Layers, permission: PERMISSIONS.CLASSES_MANAGE },
  { href: "/subjects", label: "Subjects", icon: BookOpen, permission: PERMISSIONS.SUBJECTS_MANAGE },
  { href: "/students", label: "Students", icon: GraduationCap, permission: PERMISSIONS.STUDENTS_READ },
  { href: "/parents", label: "Parents", icon: Users, permission: PERMISSIONS.PARENTS_READ },
  { href: "/teachers", label: "Teachers", icon: UserRound, permission: PERMISSIONS.TEACHERS_READ },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, permission: PERMISSIONS.ATTENDANCE_READ },
  { href: "/homework", label: "Homework", icon: BookOpen, permission: PERMISSIONS.HOMEWORK_READ },
  { href: "/timetable", label: "Timetable", icon: Calendar, permission: PERMISSIONS.TIMETABLE_READ },
  { href: "/exams", label: "Exams & Marks", icon: ClipboardList, permission: PERMISSIONS.EXAMS_READ },
  { href: "/fees", label: "Fees", icon: Banknote, permission: PERMISSIONS.FEES_READ },
  { href: "/notices", label: "Notices", icon: MessageSquare, permission: PERMISSIONS.NOTICES_READ },
  { href: "/events", label: "Events", icon: CalendarDays, permission: PERMISSIONS.EVENTS_READ },
  { href: "/holidays", label: "Holidays", icon: Sun, permission: PERMISSIONS.NOTICES_READ },
  {
    href: "/reports",
    label: "Reports",
    icon: FileBarChart,
    permission: [PERMISSIONS.REPORTS_ATTENDANCE, PERMISSIONS.REPORTS_FEES, PERMISSIONS.REPORTS_PROGRESS],
  },
  { href: "/roles", label: "Role Assignment", icon: ShieldCheck, permission: PERMISSIONS.ROLES_ASSIGN },
  { href: "/settings", label: "Settings", icon: Settings, permission: PERMISSIONS.SCHOOL_SETTINGS_READ },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { branding, acl, theme } = useAppBranding();
  const items = NAV.filter((i) => {
    if (!i.permission) return true;
    if (Array.isArray(i.permission)) {
      return i.permission.some((p) => acl.permissions.includes(p));
    }
    return acl.permissions.includes(i.permission);
  });

  return (
    <aside className="flex w-60 flex-col text-white" style={{ background: theme.colors.primaryDark }}>
      <div className="px-5 py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">SchoolOS</p>
        <p className="mt-2 font-display text-lg font-semibold leading-tight">{branding.schoolName}</p>
        <p className="mt-1 text-xs text-accent">{branding.tagline}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                active ? "bg-white/15" : "text-white/80 hover:bg-white/10",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        className="m-4 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10"
        onClick={() => {
          void (async () => {
            try {
              await api().auth.logout();
            } catch {
              /* revoke best-effort */
            }
            clearSession();
            router.replace("/login");
          })();
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}
