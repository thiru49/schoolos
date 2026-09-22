import { PERMISSIONS, type PermissionCode } from "@schoolos/permissions";
import { filterVisibleShortcuts, resolveMobileHomeRole, type MobileHomeRole } from "./home-policy";
import { getAcademicModulesForRole, type AcademicModuleId } from "./role-modules";

export type ScenarioActor = {
  login: string;
  role: MobileHomeRole;
  roles: string[];
  permissions: PermissionCode[];
};

export const ACTORS: Record<MobileHomeRole, ScenarioActor> = {
  teacher: {
    login: "TCH-8A",
    role: "teacher",
    roles: ["teacher"],
    permissions: [
      PERMISSIONS.TIMETABLE_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.ATTENDANCE_MARK,
      PERMISSIONS.HOMEWORK_READ,
      PERMISSIONS.HOMEWORK_CREATE,
      PERMISSIONS.EXAMS_READ,
      PERMISSIONS.MARKS_DRAFT,
      PERMISSIONS.NOTICES_READ,
    ],
  },
  parent: {
    login: "9000000001",
    role: "parent",
    roles: ["parent"],
    permissions: [
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.HOMEWORK_READ,
      PERMISSIONS.FEES_READ,
      PERMISSIONS.MARKS_READ,
      PERMISSIONS.NOTICES_READ,
    ],
  },
  student: {
    login: "AN2021-0001",
    role: "student",
    roles: ["student"],
    permissions: [
      PERMISSIONS.TIMETABLE_READ,
      PERMISSIONS.HOMEWORK_READ,
      PERMISSIONS.HOMEWORK_COMPLETE,
      PERMISSIONS.MARKS_READ,
      PERMISSIONS.ATTENDANCE_READ,
      PERMISSIONS.NOTICES_READ,
    ],
  },
};

export const AUTH_FLOW = ["/", "/school-select", "/login", "/role-select", "/(tabs)/home"] as const;

export const TAB_ROUTES = ["/(tabs)/home", "/(tabs)/academics", "/(tabs)/updates", "/(tabs)/profile"] as const;

export type ScreenScenario = {
  id: string;
  actor: MobileHomeRole;
  route: string;
  canOpen: boolean;
  ui: string;
  mustNot: string[];
};

export const SCREEN_SCENARIOS: ScreenScenario[] = [
  {
    id: "T1-home",
    actor: "teacher",
    route: "/(tabs)/home",
    canOpen: true,
    ui: "TeacherHomeDashboard",
    mustNot: ["ChildSwitcher", "Fees"],
  },
  {
    id: "T2-roster",
    actor: "teacher",
    route: "/attendance",
    canOpen: true,
    ui: "TeacherRoster",
    mustNot: ["ParentHistory"],
  },
  {
    id: "T3-homework",
    actor: "teacher",
    route: "/homework",
    canOpen: true,
    ui: "assign-sheet",
    mustNot: [],
  },
  {
    id: "T4-marks",
    actor: "teacher",
    route: "/marks",
    canOpen: true,
    ui: "TeacherMarksEntry",
    mustNot: [],
  },
  {
    id: "T5-fees-hidden",
    actor: "teacher",
    route: "/fees",
    canOpen: false,
    ui: "denied-or-hidden",
    mustNot: ["collect-upi"],
  },
  {
    id: "P1-home",
    actor: "parent",
    route: "/(tabs)/home",
    canOpen: true,
    ui: "ParentHomeDashboard",
    mustNot: ["TeacherRoster"],
  },
  {
    id: "P2-calendar",
    actor: "parent",
    route: "/attendance",
    canOpen: true,
    ui: "ParentHistory",
    mustNot: ["Save roster"],
  },
  {
    id: "P3-fees",
    actor: "parent",
    route: "/fees",
    canOpen: true,
    ui: "dues-receipts",
    mustNot: ["collect-upi"],
  },
  {
    id: "P4-report",
    actor: "parent",
    route: "/report-card",
    canOpen: true,
    ui: "published-only",
    mustNot: ["draft-entry"],
  },
  {
    id: "S1-home",
    actor: "student",
    route: "/(tabs)/home",
    canOpen: true,
    ui: "StudentHomeDashboard",
    mustNot: ["Fees", "ChildSwitcher"],
  },
  {
    id: "S2-fees-hidden",
    actor: "student",
    route: "/fees",
    canOpen: false,
    ui: "hidden",
    mustNot: ["dues"],
  },
  {
    id: "S3-marks",
    actor: "student",
    route: "/marks",
    canOpen: true,
    ui: "published-own",
    mustNot: ["TeacherMarksEntry"],
  },
];

export function visibleRoutesFor(actor: MobileHomeRole): string[] {
  return filterVisibleShortcuts(ACTORS[actor].role, ACTORS[actor].permissions).map((s) => s.route);
}

export function academicModulesFor(actor: MobileHomeRole): AcademicModuleId[] {
  return getAcademicModulesForRole(actor);
}

export function canOpenRoute(actor: MobileHomeRole, route: string): boolean {
  if (route.startsWith("/(") || AUTH_FLOW.includes(route as (typeof AUTH_FLOW)[number])) return true;
  if (route === "/fees") return actor === "parent";
  if (route === "/report-card") return actor !== "teacher";
  return visibleRoutesFor(actor).includes(route);
}

export function homeDashboardFor(activeRole: string | null, roles: string[]): string {
  const resolved = resolveMobileHomeRole(activeRole as never, roles as never);
  if (resolved === "teacher") return "TeacherHomeDashboard";
  if (resolved === "parent") return "ParentHomeDashboard";
  if (resolved === "student") return "StudentHomeDashboard";
  return "needs-role-select";
}

export function isolationCases() {
  return [
    { actor: "teacher" as const, section: "8-A", expected: "roster" },
    { actor: "teacher" as const, section: "9-B", expected: "403" },
    { actor: "parent" as const, child: "Arun", expected: "scoped" },
    { actor: "parent" as const, child: "school-b", expected: "empty-or-403" },
    { actor: "student" as const, record: "own", expected: "own-only" },
  ];
}
