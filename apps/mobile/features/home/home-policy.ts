import { PERMISSIONS, ROLE_CODES, type PermissionCode, type RoleCode } from "@schoolos/permissions";

export type MobileHomeRole = "teacher" | "student" | "parent";

export type HomeShortcut = {
  id: string;
  label: string;
  route: `/${string}`;
  permission?: PermissionCode;
};

export const MOBILE_HOME_ROLE_LABELS: Record<MobileHomeRole, string> = {
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

const MOBILE_HOME_ROLES: MobileHomeRole[] = ["teacher", "student", "parent"];

export function resolveMobileHomeRole(
  activeRole: RoleCode | null | undefined,
  roles: RoleCode[] | undefined,
): MobileHomeRole | null {
  const role = activeRole ?? (roles?.length === 1 ? roles[0] : null);
  if (role === ROLE_CODES.TEACHER) return "teacher";
  if (role === ROLE_CODES.STUDENT) return "student";
  if (role === ROLE_CODES.PARENT) return "parent";
  return null;
}

export function needsActiveRoleSelection(
  activeRole: RoleCode | null | undefined,
  roles: RoleCode[] | undefined,
): boolean {
  if (activeRole) return false;
  return (roles?.length ?? 0) > 1;
}

export function isShortcutVisible(shortcut: HomeShortcut, permissions: PermissionCode[]): boolean {
  if (!shortcut.permission) return true;
  return permissions.includes(shortcut.permission);
}

export function getHomeShortcuts(role: MobileHomeRole): HomeShortcut[] {
  switch (role) {
    case "teacher":
      return [
        { id: "today-classes", label: "Today's classes", route: "/timetable", permission: PERMISSIONS.TIMETABLE_READ },
        { id: "attendance", label: "Attendance", route: "/attendance", permission: PERMISSIONS.ATTENDANCE_READ },
        { id: "homework", label: "Homework", route: "/homework", permission: PERMISSIONS.HOMEWORK_READ },
        { id: "timetable", label: "Timetable", route: "/timetable", permission: PERMISSIONS.TIMETABLE_READ },
        { id: "exams", label: "Exams", route: "/marks", permission: PERMISSIONS.EXAMS_READ },
        { id: "notices", label: "Notices", route: "/notices", permission: PERMISSIONS.NOTICES_READ },
      ];
    case "student":
      return [
        { id: "timetable", label: "Today's timetable", route: "/timetable", permission: PERMISSIONS.TIMETABLE_READ },
        { id: "homework", label: "Homework", route: "/homework", permission: PERMISSIONS.HOMEWORK_READ },
        { id: "exams", label: "Exam results", route: "/marks", permission: PERMISSIONS.MARKS_READ },
        { id: "attendance", label: "Attendance", route: "/attendance", permission: PERMISSIONS.ATTENDANCE_READ },
        { id: "notices", label: "Notices", route: "/notices", permission: PERMISSIONS.NOTICES_READ },
      ];
    case "parent":
      return [
        { id: "attendance", label: "Attendance", route: "/attendance", permission: PERMISSIONS.ATTENDANCE_READ },
        { id: "homework", label: "Homework", route: "/homework", permission: PERMISSIONS.HOMEWORK_READ },
        { id: "fees", label: "Fees", route: "/fees", permission: PERMISSIONS.FEES_READ },
        { id: "exams", label: "Exam results", route: "/marks", permission: PERMISSIONS.MARKS_READ },
        { id: "notices", label: "Notices", route: "/notices", permission: PERMISSIONS.NOTICES_READ },
      ];
  }
}

export function filterVisibleShortcuts(role: MobileHomeRole, permissions: PermissionCode[]): HomeShortcut[] {
  return getHomeShortcuts(role).filter((shortcut) => isShortcutVisible(shortcut, permissions));
}

export function getMobileHomeTitle(role: MobileHomeRole): string {
  switch (role) {
    case "teacher":
      return "Your day";
    case "student":
    case "parent":
      return "Today";
  }
}

export function isMobileHomeRole(value: string): value is MobileHomeRole {
  return MOBILE_HOME_ROLES.includes(value as MobileHomeRole);
}
