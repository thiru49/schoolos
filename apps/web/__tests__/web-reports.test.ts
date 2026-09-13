import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";
import type { PermissionCode, RoleCode, ScopeType } from "@schoolos/types";

console.log("Starting REPORT-002 Web Reports Unit & Logic Tests...\n");

// ============================================================================
// Types & Helper Models
// ============================================================================
type AclScope = {
  type: ScopeType;
  classId?: string;
  sectionId?: string;
};

type UserAcl = {
  roles: RoleCode[];
  permissions: PermissionCode[];
  scopes: AclScope[];
};

// ============================================================================
// 1. Sidebar Navigation Filtering & Active Route Matching Logic
// ============================================================================
const NAV_REPORTS_ITEM = {
  href: "/reports",
  label: "Reports",
  permission: [
    PERMISSIONS.REPORTS_ATTENDANCE,
    PERMISSIONS.REPORTS_FEES,
    PERMISSIONS.REPORTS_PROGRESS,
  ],
};

function canSeeReportsInSidebar(acl: UserAcl): boolean {
  if (!NAV_REPORTS_ITEM.permission) return true;
  if (Array.isArray(NAV_REPORTS_ITEM.permission)) {
    return NAV_REPORTS_ITEM.permission.some((p) => acl.permissions.includes(p));
  }
  return acl.permissions.includes(NAV_REPORTS_ITEM.permission);
}

function isSidebarItemActive(itemHref: string, currentPathname: string): boolean {
  return (
    currentPathname === itemHref ||
    (itemHref !== "/dashboard" && currentPathname.startsWith(itemHref + "/"))
  );
}

// 1a. Sidebar visibility for various roles
const superAdminAcl: UserAcl = {
  roles: ["school_super_admin"],
  permissions: [
    PERMISSIONS.REPORTS_ATTENDANCE,
    PERMISSIONS.REPORTS_FEES,
    PERMISSIONS.REPORTS_PROGRESS,
  ],
  scopes: [{ type: "school" }],
};
assert.equal(canSeeReportsInSidebar(superAdminAcl), true, "Super Admin sees Reports in sidebar");

const accountsAdminAcl: UserAcl = {
  roles: ["accounts_admin"],
  permissions: [PERMISSIONS.REPORTS_FEES],
  scopes: [{ type: "school" }],
};
assert.equal(canSeeReportsInSidebar(accountsAdminAcl), true, "Accounts Admin sees Reports in sidebar");

const academicAdminAcl: UserAcl = {
  roles: ["academic_admin"],
  permissions: [PERMISSIONS.REPORTS_ATTENDANCE, PERMISSIONS.REPORTS_PROGRESS],
  scopes: [{ type: "school" }],
};
assert.equal(canSeeReportsInSidebar(academicAdminAcl), true, "Academic Admin sees Reports in sidebar");

const teacherAcl: UserAcl = {
  roles: ["teacher"],
  permissions: [PERMISSIONS.REPORTS_ATTENDANCE, PERMISSIONS.REPORTS_PROGRESS],
  scopes: [{ type: "section", sectionId: "sec-101" }],
};
assert.equal(canSeeReportsInSidebar(teacherAcl), true, "Teacher sees Reports in sidebar");

const parentAcl: UserAcl = {
  roles: ["parent"],
  permissions: [PERMISSIONS.NOTICES_READ, PERMISSIONS.EVENTS_READ],
  scopes: [{ type: "children" }],
};
assert.equal(canSeeReportsInSidebar(parentAcl), false, "Parent does NOT see Reports in sidebar");

const studentAcl: UserAcl = {
  roles: ["student"],
  permissions: [PERMISSIONS.NOTICES_READ, PERMISSIONS.EVENTS_READ],
  scopes: [{ type: "self" }],
};
assert.equal(canSeeReportsInSidebar(studentAcl), false, "Student does NOT see Reports in sidebar");

// 1b. Active route matching with prefix
assert.equal(isSidebarItemActive("/reports", "/reports"), true, "Matches exact /reports");
assert.equal(isSidebarItemActive("/reports", "/reports/attendance"), true, "Matches child /reports/attendance");
assert.equal(isSidebarItemActive("/reports", "/reports/progress"), true, "Matches child /reports/progress");
assert.equal(isSidebarItemActive("/reports", "/reports/fee-collection"), true, "Matches child /reports/fee-collection");
assert.equal(isSidebarItemActive("/reports", "/reports/payments"), true, "Matches child /reports/payments");
assert.equal(isSidebarItemActive("/reports", "/reports/students"), true, "Matches child /reports/students");
assert.equal(isSidebarItemActive("/reports", "/reports/teachers"), true, "Matches child /reports/teachers");
assert.equal(isSidebarItemActive("/reports", "/students"), false, "Does not match unrelated /students");
assert.equal(isSidebarItemActive("/dashboard", "/dashboard/subpage"), false, "Dashboard does not prefix match");

console.log("✓ Sidebar navigation filtering and active route matching tests passed");

// ============================================================================
// 2. Reports Hub Role-Filtered Card Visibility (Mockup Page 54)
// ============================================================================
function getVisibleReportCards(acl: UserAcl): string[] {
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

  const cards = [
    { id: "attendance", visible: canAttendance },
    { id: "progress", visible: canProgress },
    { id: "fee-collection", visible: canFees },
    { id: "payments", visible: canFees },
    { id: "students", visible: canStudentList },
    { id: "teachers", visible: canTeacherWorkload },
  ];

  return cards.filter((c) => c.visible).map((c) => c.id);
}

// 2a. Super Admin sees all 6 cards
const superAdminCards = getVisibleReportCards(superAdminAcl);
assert.equal(superAdminCards.length, 6, "Super Admin sees all 6 cards");
assert.deepEqual(
  superAdminCards,
  ["attendance", "progress", "fee-collection", "payments", "students", "teachers"],
  "Super Admin card IDs match expected"
);

// 2b. Accounts Admin sees only 2 cards (Fee Collection and Payments)
const accountsAdminCards = getVisibleReportCards(accountsAdminAcl);
assert.equal(accountsAdminCards.length, 2, "Accounts Admin sees exactly 2 cards");
assert.deepEqual(accountsAdminCards, ["fee-collection", "payments"]);

// 2c. Academic Admin sees 4 cards (Attendance, Progress, Students, Teacher Workload)
const academicAdminCards = getVisibleReportCards(academicAdminAcl);
assert.equal(academicAdminCards.length, 4, "Academic Admin sees exactly 4 cards");
assert.deepEqual(academicAdminCards, ["attendance", "progress", "students", "teachers"]);

// 2d. Teacher sees 3 cards (Attendance, Progress, Students) - workload and fees hidden
const teacherCards = getVisibleReportCards(teacherAcl);
assert.equal(teacherCards.length, 3, "Teacher sees exactly 3 cards");
assert.deepEqual(teacherCards, ["attendance", "progress", "students"]);
assert.equal(teacherCards.includes("teachers"), false, "Teacher Workload hidden from teacher");
assert.equal(teacherCards.includes("fee-collection"), false, "Fee Collection hidden from teacher");
assert.equal(teacherCards.includes("payments"), false, "Payment Report hidden from teacher");

// 2e. Attendance-only user does NOT see Student List card
const attendanceOnlyAcl: UserAcl = {
  roles: ["teacher"],
  permissions: [PERMISSIONS.REPORTS_ATTENDANCE],
  scopes: [{ type: "section", sectionId: "sec-101" }],
};
const attendanceOnlyCards = getVisibleReportCards(attendanceOnlyAcl);
assert.equal(attendanceOnlyCards.includes("students"), false, "Attendance-only user does not see Student List card");
assert.deepEqual(attendanceOnlyCards, ["attendance"]);

// 2f. Parent/Student sees 0 cards
assert.equal(getVisibleReportCards(parentAcl).length, 0, "Parent sees 0 cards");
assert.equal(getVisibleReportCards(studentAcl).length, 0, "Student sees 0 cards");

console.log("✓ Reports Hub role-filtered card visibility tests passed (Mockup Page 54)");

// ============================================================================
// 3. Direct Route Protection Logic
// ============================================================================
function checkDirectRouteAccess(
  route: "/reports/attendance" | "/reports/progress" | "/reports/fee-collection" | "/reports/payments" | "/reports/students" | "/reports/teachers",
  acl: UserAcl
): { allowed: boolean; reason?: string } {
  const hasSchoolScope = acl.scopes.some((s) => s.type === "school");

  switch (route) {
    case "/reports/fee-collection":
    case "/reports/payments":
      if (!acl.permissions.includes(PERMISSIONS.REPORTS_FEES)) {
        return { allowed: false, reason: "Missing permission reports.fees" };
      }
      if (!hasSchoolScope) {
        return { allowed: false, reason: "Fee reports require school scope" };
      }
      return { allowed: true };

    case "/reports/teachers": {
      const isTeacher =
        acl.roles.includes("teacher") &&
        !acl.roles.some((r) =>
          ["school_super_admin", "school_admin", "academic_admin"].includes(r)
        );
      if (isTeacher) {
        return { allowed: false, reason: "Teachers are not authorized to view the teacher workload report" };
      }
      const hasAdminRole = acl.roles.some((r) =>
        ["school_super_admin", "school_admin", "academic_admin"].includes(r)
      );
      if (!hasAdminRole) {
        return { allowed: false, reason: "Teacher workload report requires administrative role" };
      }
      if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
        return { allowed: false, reason: "Missing permission reports.progress" };
      }
      if (!hasSchoolScope) {
        return { allowed: false, reason: "Teacher workload report requires school scope" };
      }
      return { allowed: true };
    }

    case "/reports/students":
      if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
        return { allowed: false, reason: "Student list report requires reports.progress permission" };
      }
      return { allowed: true };

    case "/reports/progress":
      if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
        return { allowed: false, reason: "Progress report requires progress reporting permissions" };
      }
      return { allowed: true };

    case "/reports/attendance":
      if (!acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE)) {
        return { allowed: false, reason: "Attendance report requires attendance reporting permissions" };
      }
      return { allowed: true };
  }
}

// 3a. Fee reports direct route check
assert.equal(checkDirectRouteAccess("/reports/fee-collection", superAdminAcl).allowed, true);
assert.equal(checkDirectRouteAccess("/reports/fee-collection", accountsAdminAcl).allowed, true);
assert.equal(checkDirectRouteAccess("/reports/fee-collection", teacherAcl).allowed, false);
assert.equal(
  checkDirectRouteAccess("/reports/fee-collection", teacherAcl).reason,
  "Missing permission reports.fees"
);

// 3b. Teacher workload direct route check: Admin roles ALLOWED
assert.equal(checkDirectRouteAccess("/reports/teachers", superAdminAcl).allowed, true, "Super Admin allowed on /reports/teachers");
assert.equal(checkDirectRouteAccess("/reports/teachers", academicAdminAcl).allowed, true, "Academic Admin allowed on /reports/teachers");

// 3c. Teacher direct navigation to /reports/teachers => STRICTLY DENIED
assert.equal(checkDirectRouteAccess("/reports/teachers", teacherAcl).allowed, false, "Teacher directly denied on /reports/teachers");
assert.equal(
  checkDirectRouteAccess("/reports/teachers", teacherAcl).reason,
  "Teachers are not authorized to view the teacher workload report"
);

// 3d. Teacher CANNOT bypass denial even if possessing reports.progress AND school scope
const teacherWithSchoolScopeAcl: UserAcl = {
  roles: ["teacher"],
  permissions: [PERMISSIONS.REPORTS_PROGRESS, PERMISSIONS.REPORTS_ATTENDANCE],
  scopes: [{ type: "school" }],
};
assert.equal(
  checkDirectRouteAccess("/reports/teachers", teacherWithSchoolScopeAcl).allowed,
  false,
  "Teacher cannot bypass /reports/teachers denial by possessing reports.progress and school scope"
);
assert.equal(
  checkDirectRouteAccess("/reports/teachers", teacherWithSchoolScopeAcl).reason,
  "Teachers are not authorized to view the teacher workload report"
);

// 3e. Multi-role Teacher + Academic Admin (or School Admin / Super Admin) => ALLOWED
const teacherAcademicAdminAcl: UserAcl = {
  roles: ["teacher", "academic_admin"],
  permissions: [PERMISSIONS.REPORTS_PROGRESS, PERMISSIONS.REPORTS_ATTENDANCE],
  scopes: [{ type: "school" }],
};
assert.equal(
  checkDirectRouteAccess("/reports/teachers", teacherAcademicAdminAcl).allowed,
  true,
  "Multi-role Teacher + Academic Admin allowed on /reports/teachers"
);

const teacherSuperAdminAcl: UserAcl = {
  roles: ["teacher", "school_super_admin"],
  permissions: [PERMISSIONS.REPORTS_PROGRESS, PERMISSIONS.REPORTS_FEES, PERMISSIONS.REPORTS_ATTENDANCE],
  scopes: [{ type: "school" }],
};
assert.equal(
  checkDirectRouteAccess("/reports/teachers", teacherSuperAdminAcl).allowed,
  true,
  "Multi-role Teacher + Super Admin allowed on /reports/teachers"
);

const teacherSchoolAdminAcl: UserAcl = {
  roles: ["teacher", "school_admin"],
  permissions: [PERMISSIONS.REPORTS_PROGRESS, PERMISSIONS.REPORTS_FEES, PERMISSIONS.REPORTS_ATTENDANCE],
  scopes: [{ type: "school" }],
};
assert.equal(
  checkDirectRouteAccess("/reports/teachers", teacherSchoolAdminAcl).allowed,
  true,
  "Multi-role Teacher + School Admin allowed on /reports/teachers"
);

// 3f. Student List canonical permission enforcement:
// - User with reports.progress => ALLOWED
assert.equal(checkDirectRouteAccess("/reports/students", teacherAcl).allowed, true, "Teacher with reports.progress allowed on /reports/students");
assert.equal(checkDirectRouteAccess("/reports/students", academicAdminAcl).allowed, true, "Admin with reports.progress allowed on /reports/students");

// - User with reports.attendance ONLY => STRICTLY DENIED on /reports/students
assert.equal(
  checkDirectRouteAccess("/reports/students", attendanceOnlyAcl).allowed,
  false,
  "User with reports.attendance only is denied on /reports/students"
);
assert.equal(
  checkDirectRouteAccess("/reports/students", attendanceOnlyAcl).reason,
  "Student list report requires reports.progress permission"
);

// 3f. Unprivileged user blocked from all routes
assert.equal(checkDirectRouteAccess("/reports/attendance", parentAcl).allowed, false);
assert.equal(checkDirectRouteAccess("/reports/progress", parentAcl).allowed, false);
assert.equal(checkDirectRouteAccess("/reports/students", parentAcl).allowed, false);
assert.equal(checkDirectRouteAccess("/reports/teachers", parentAcl).allowed, false);

console.log("✓ Direct route protection logic tests passed");

// ============================================================================
// 4. Teacher Section Scoping Filter Logic
// ============================================================================
type Section = { id: string; label: string };
const mockAllSections: Section[] = [
  { id: "sec-101", label: "Grade 10 - A" },
  { id: "sec-102", label: "Grade 10 - B" },
  { id: "sec-103", label: "Grade 11 - A" },
];

function getVisibleSectionsForUser(allSections: Section[], acl: UserAcl): Section[] {
  const hasSchoolScope = acl.scopes.some((s) => s.type === "school");
  if (hasSchoolScope) return allSections;

  const allowedSectionIds = acl.scopes
    .filter((s) => s.type === "section" && Boolean(s.sectionId))
    .map((s) => s.sectionId as string);

  return allSections.filter((s) => allowedSectionIds.includes(s.id));
}

// Admin gets all 3 sections
const adminVisibleSections = getVisibleSectionsForUser(mockAllSections, superAdminAcl);
assert.equal(adminVisibleSections.length, 3, "Admin sees all sections");

// Teacher with sec-101 only gets sec-101
const teacherVisibleSections = getVisibleSectionsForUser(mockAllSections, teacherAcl);
assert.equal(teacherVisibleSections.length, 1, "Teacher sees only assigned sections");
assert.equal(teacherVisibleSections[0].id, "sec-101");

console.log("✓ Teacher section scoping filter tests passed");

// ============================================================================
// 5. Date Range Validation Logic
// ============================================================================
function validateDateRange(from?: string, to?: string): string | null {
  if (from && to && from > to) {
    return "From date cannot be after To date";
  }
  return null;
}

assert.equal(validateDateRange("2026-09-01", "2026-09-30"), null, "Valid chronological range");
assert.equal(validateDateRange("2026-09-15", "2026-09-15"), null, "Same day range is valid");
assert.equal(
  validateDateRange("2026-09-30", "2026-09-01"),
  "From date cannot be after To date",
  "Inverted date range rejected"
);
assert.equal(validateDateRange(undefined, "2026-09-30"), null, "Missing from date is valid");
assert.equal(validateDateRange("2026-09-01", undefined), null, "Missing to date is valid");

console.log("✓ Date range validation tests passed");

// ============================================================================
// 6. CSV Export Query URL Construction Logic
// ============================================================================
function buildFeeCollectionExportUrl(query?: { classId?: string; sectionId?: string }): string {
  const q = new URLSearchParams();
  if (query?.classId) q.set("classId", query.classId);
  if (query?.sectionId) q.set("sectionId", query.sectionId);
  const qs = q.toString();
  return `/reports/fees/collection/export${qs ? `?${qs}` : ""}`;
}

function buildPaymentsExportUrl(query?: {
  from?: string;
  to?: string;
  method?: string;
  sectionId?: string;
}): string {
  const q = new URLSearchParams();
  if (query?.from) q.set("from", query.from);
  if (query?.to) q.set("to", query.to);
  if (query?.method) q.set("method", query.method);
  if (query?.sectionId) q.set("sectionId", query.sectionId);
  const qs = q.toString();
  return `/reports/fees/payments/export${qs ? `?${qs}` : ""}`;
}

assert.equal(buildFeeCollectionExportUrl(), "/reports/fees/collection/export");
assert.equal(
  buildFeeCollectionExportUrl({ sectionId: "sec-101" }),
  "/reports/fees/collection/export?sectionId=sec-101"
);
assert.equal(
  buildPaymentsExportUrl({ from: "2026-09-01", to: "2026-09-15", method: "cash" }),
  "/reports/fees/payments/export?from=2026-09-01&to=2026-09-15&method=cash"
);

console.log("✓ CSV export query URL construction tests passed");

console.log("\n========================================================");
console.log("ALL REPORT-002 WEB REPORTS LOGIC & RBAC TESTS PASSED (6/6)");
console.log("========================================================\n");
