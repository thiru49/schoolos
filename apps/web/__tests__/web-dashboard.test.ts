import assert from "node:assert/strict";
import { PERMISSIONS, ROLE_CODES, type RoleCode, type PermissionCode } from "@schoolos/permissions";
import {
  resolveDefaultDashboardRole,
  getAvailableDashboardRoles,
  canAccessFees,
  canAccessSettings,
  canManageRoles,
  canManageAcademicYears,
  canManageClasses,
  type DashboardRole,
} from "../features/dashboard/dashboard-policy";

console.log("Starting PRODUCT-UX-002 Web Dashboard & Navigation Unit Tests...\n");

// ============================================================================
// 1. Sidebar Navigation Filtering for Fees
// ============================================================================

const NAV_FEES_ITEM = {
  href: "/fees",
  label: "Fees",
  permission: PERMISSIONS.FEES_READ,
};

function canSeeFeesInSidebar(acl: { permissions: PermissionCode[] }): boolean {
  if (!NAV_FEES_ITEM.permission) return true;
  if (Array.isArray(NAV_FEES_ITEM.permission)) {
    return NAV_FEES_ITEM.permission.some((p) => acl.permissions.includes(p));
  }
  return acl.permissions.includes(NAV_FEES_ITEM.permission);
}

// 1a. User with FEES_READ sees Fees
const accountsAdminAcl = {
  roles: [ROLE_CODES.ACCOUNTS_ADMIN],
  permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ, PERMISSIONS.REPORTS_FEES],
};
assert.equal(canSeeFeesInSidebar(accountsAdminAcl), true, "Accounts Admin sees Fees in sidebar");
assert.equal(canAccessFees(accountsAdminAcl), true, "canAccessFees is true for Accounts Admin");

const superAdminAcl = {
  roles: [ROLE_CODES.SCHOOL_SUPER_ADMIN],
  permissions: [
    PERMISSIONS.FEES_READ,
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.ROLES_ASSIGN,
    PERMISSIONS.ACADEMIC_YEAR_MANAGE,
    PERMISSIONS.CLASSES_MANAGE,
  ],
};
assert.equal(canSeeFeesInSidebar(superAdminAcl), true, "Super Admin sees Fees in sidebar");
assert.equal(canAccessFees(superAdminAcl), true, "canAccessFees is true for Super Admin");

// 1b. User without FEES_READ does NOT see Fees
const teacherAcl = {
  roles: [ROLE_CODES.TEACHER],
  permissions: [
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.HOMEWORK_CREATE,
    PERMISSIONS.TIMETABLE_READ,
  ],
};
assert.equal(canSeeFeesInSidebar(teacherAcl), false, "Teacher without FEES_READ does not see Fees");
assert.equal(canAccessFees(teacherAcl), false, "canAccessFees is false for Teacher");

const parentAcl = {
  roles: [ROLE_CODES.PARENT],
  permissions: [PERMISSIONS.RECEIPTS_READ],
};
assert.equal(canSeeFeesInSidebar(parentAcl), false, "Parent without FEES_READ does not see Fees in web sidebar");

const studentAcl = {
  roles: [ROLE_CODES.STUDENT],
  permissions: [],
};
assert.equal(canSeeFeesInSidebar(studentAcl), false, "Student does not see Fees in web sidebar");

console.log("✓ Sidebar Fees permission filtering tests passed");

// ============================================================================
// 2. Role-Aware Dashboard Resolution
// ============================================================================

// 2a. Single role resolution
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.SCHOOL_SUPER_ADMIN]),
  "school_super_admin",
  "Super admin resolves to school_super_admin",
);
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.SCHOOL_ADMIN]),
  "school_admin",
  "School admin resolves to school_admin",
);
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.ACADEMIC_ADMIN]),
  "school_admin",
  "Academic admin resolves to school_admin",
);
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.ACCOUNTS_ADMIN]),
  "accounts_admin",
  "Accounts admin resolves to accounts_admin",
);
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.TEACHER]),
  "teacher",
  "Teacher resolves to teacher",
);
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.PARENT]),
  "other",
  "Parent resolves to other (non-web dashboard persona)",
);
assert.equal(
  resolveDefaultDashboardRole([ROLE_CODES.STUDENT]),
  "other",
  "Student resolves to other (non-web dashboard persona)",
);

console.log("✓ Single role default resolution tests passed");

// ============================================================================
// 3. Multi-Role Handling & Switching
// ============================================================================

// 3a. Available roles list for multi-role accounts
const multiAdminAcl = [ROLE_CODES.SCHOOL_ADMIN, ROLE_CODES.ACCOUNTS_ADMIN];
const availableForMulti = getAvailableDashboardRoles(multiAdminAcl);
assert.deepEqual(
  availableForMulti,
  ["school_admin", "accounts_admin"],
  "Multi-role user has both school_admin and accounts_admin available",
);

// Initial landing defaults deterministically
const defaultForMulti = resolveDefaultDashboardRole(multiAdminAcl);
assert.equal(defaultForMulti, "school_admin", "Deterministic initial landing is school_admin");

// Available roles enables switching to accounts_admin
assert.equal(
  availableForMulti.includes("accounts_admin"),
  true,
  "User can select accounts_admin view",
);

// 3b. Super admin + teacher
const superAndTeacher = [ROLE_CODES.SCHOOL_SUPER_ADMIN, ROLE_CODES.TEACHER];
const availableSuperTeacher = getAvailableDashboardRoles(superAndTeacher);
assert.deepEqual(
  availableSuperTeacher,
  ["school_super_admin", "teacher"],
  "Super admin + teacher has both roles available",
);
assert.equal(
  resolveDefaultDashboardRole(superAndTeacher),
  "school_super_admin",
  "Initial landing defaults to school_super_admin",
);

// 3c. Pure parent or student has no web dashboard roles
assert.deepEqual(
  getAvailableDashboardRoles([ROLE_CODES.PARENT]),
  [],
  "Parent has no web administration dashboard views",
);
assert.deepEqual(
  getAvailableDashboardRoles([ROLE_CODES.STUDENT]),
  [],
  "Student has no web administration dashboard views",
);

console.log("✓ Multi-role detection and switching tests passed");

// ============================================================================
// 4. Checklist & State Integrity (No Fake Data / KPIs)
// ============================================================================

// Test setup checklist evaluation logic for new vs configured schools
function evaluateChecklist(data: {
  academicYears: { id: string; name: string; isActive: boolean }[];
  classes: { id: string; name: string }[];
  sections: { id: string; label: string }[];
  subjects: { id: string; name: string }[];
  teacherCount: number;
  studentCount: number;
  schoolName: string;
}) {
  return {
    yearComplete: data.academicYears.length > 0,
    classesComplete: data.classes.length > 0 && data.sections.length > 0,
    subjectsComplete: data.subjects.length > 0,
    teachersComplete: data.teacherCount > 0,
    studentsComplete: data.studentCount > 0,
    brandingComplete: Boolean(data.schoolName),
  };
}

// 4a. Newly provisioned school (0 classes, 0 students)
const newSchoolStatus = evaluateChecklist({
  academicYears: [{ id: "y1", name: "2026-27", isActive: true }],
  classes: [],
  sections: [],
  subjects: [],
  teacherCount: 0,
  studentCount: 0,
  schoolName: "New Pilot School",
});
assert.equal(newSchoolStatus.yearComplete, true, "Academic year is complete from provisioning");
assert.equal(newSchoolStatus.classesComplete, false, "Classes not complete yet");
assert.equal(newSchoolStatus.subjectsComplete, false, "Subjects not complete yet");
assert.equal(newSchoolStatus.teachersComplete, false, "Teachers not complete yet");
assert.equal(newSchoolStatus.studentsComplete, false, "Students not complete yet");
assert.equal(newSchoolStatus.brandingComplete, true, "Branding is complete");

// 4b. Fully configured school
const fullyConfiguredStatus = evaluateChecklist({
  academicYears: [{ id: "y1", name: "2026-27", isActive: true }],
  classes: [{ id: "c1", name: "Grade 1" }],
  sections: [{ id: "s1", label: "Grade 1 - A" }],
  subjects: [{ id: "sub1", name: "Tamil" }],
  teacherCount: 5,
  studentCount: 50,
  schoolName: "Arulneri School",
});
assert.equal(fullyConfiguredStatus.classesComplete, true, "Classes complete");
assert.equal(fullyConfiguredStatus.subjectsComplete, true, "Subjects complete");
assert.equal(fullyConfiguredStatus.teachersComplete, true, "Teachers complete");
assert.equal(fullyConfiguredStatus.studentsComplete, true, "Students complete");

console.log("✓ Setup checklist evaluation tests passed");

// ============================================================================
// 5. Permission Helpers Coverage
// ============================================================================

assert.equal(canAccessSettings(superAdminAcl), true, "Super admin can access settings");
assert.equal(canManageRoles(superAdminAcl), true, "Super admin can manage roles");
assert.equal(canManageAcademicYears(superAdminAcl), true, "Super admin can manage academic years");
assert.equal(canManageClasses(superAdminAcl), true, "Super admin can manage classes");

const schoolAdminAcl = {
  roles: [ROLE_CODES.SCHOOL_ADMIN],
  permissions: [
    PERMISSIONS.STUDENTS_READ,
    PERMISSIONS.TEACHERS_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.CLASSES_MANAGE,
  ],
};
assert.equal(canManageClasses(schoolAdminAcl), true, "School admin can manage classes");
assert.equal(canManageAcademicYears(schoolAdminAcl), false, "School admin cannot manage academic years");
assert.equal(canManageRoles(schoolAdminAcl), false, "School admin cannot manage roles");

console.log("✓ Permission helper tests passed");

console.log("\n========================================================");
console.log("ALL PRODUCT-UX-002 WEB DASHBOARD & NAVIGATION TESTS PASSED");
console.log("========================================================\n");
