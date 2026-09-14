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
  MessageSquare,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PERMISSIONS, type PermissionCode } from "@schoolos/permissions";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: PermissionCode | PermissionCode[] | null;
};

export const SIDEBAR_NAV: SidebarNavItem[] = [
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

export function filterNavItems(permissions: PermissionCode[]): SidebarNavItem[] {
  return SIDEBAR_NAV.filter((item) => {
    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return item.permission.some((permission) => permissions.includes(permission));
    }
    return permissions.includes(item.permission);
  });
}

export function isNavItemActive(itemHref: string, pathname: string): boolean {
  return pathname === itemHref || (itemHref !== "/dashboard" && pathname.startsWith(itemHref + "/"));
}
