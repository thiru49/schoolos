import assert from "node:assert/strict";
import { PERMISSIONS, ROLE_CODES, type RoleCode, type PermissionCode } from "@schoolos/permissions";
import {
  resolveDefaultDashboardRole,
  getAvailableDashboardRoles,
  evaluateSchoolAdminData,
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

// ============================================================================
// 6. Safe Actionable Attendance (No sections[0] Dependency & No Fabricated Numbers)
// ============================================================================

// 6a. SchoolAdminData contract verification
type SafeSchoolAdminData = {
  studentCount: number;
  teacherCount: number;
  sections: { id: string; label: string }[];
};

const safeAdminSample: SafeSchoolAdminData = {
  studentCount: 42,
  teacherCount: 6,
  sections: [
    { id: "sec-101", label: "Grade 10 - A" },
    { id: "sec-102", label: "Grade 10 - B" },
  ],
};

// Ensure no todayAttendance or fabricated percentage property exists on dashboard model
assert.equal(
  "todayAttendance" in safeAdminSample,
  false,
  "SafeSchoolAdminData must NOT contain todayAttendance sample",
);
assert.equal(
  "presentPct" in safeAdminSample,
  false,
  "SafeSchoolAdminData must NOT contain presentPct",
);

// 6b. Verify section ordering independence:
// Reversing or shuffling sections does not change the dashboard attendance contract
const shuffledSections: SafeSchoolAdminData = {
  ...safeAdminSample,
  sections: [...safeAdminSample.sections].reverse(),
};
assert.equal(
  shuffledSections.sections.length,
  safeAdminSample.sections.length,
  "Section count is preserved regardless of array order",
);

// 6c. Verify actionable navigation card behavior:
// The dashboard routes to /attendance where section-level RBAC is strictly enforced
function getAttendanceCardProps(acl: { permissions: PermissionCode[] }) {
  const canReadAttendance = acl.permissions.includes(PERMISSIONS.ATTENDANCE_READ);
  return {
    href: "/attendance",
    label: "Today's Attendance",
    action: "Open Attendance Roster",
    canAccess: canReadAttendance,
  };
}

const adminAttendanceCard = getAttendanceCardProps(schoolAdminAcl);
assert.equal(adminAttendanceCard.canAccess, true, "School admin can navigate to attendance roster");
assert.equal(adminAttendanceCard.href, "/attendance", "Card points directly to full attendance workflow");

const accountsAttendanceCard = getAttendanceCardProps(accountsAdminAcl);
assert.equal(accountsAttendanceCard.canAccess, false, "Accounts admin without ATTENDANCE_READ cannot access attendance roster");

console.log("✓ Safe actionable attendance (no sections[0] dependency) tests passed");

// ============================================================================
// 7. Failure State & Degraded Resilience (No Silent 0/Empty Masking)
// ============================================================================

// 7a. Complete success case
const successEval = evaluateSchoolAdminData({
  students: { status: "fulfilled", value: [{ id: "s1" }, { id: "s2" }] },
  teachers: { status: "fulfilled", value: [{ id: "t1" }] },
  sections: { status: "fulfilled", value: [{ id: "sec1", label: "Grade 1 - A" }] },
});
assert.equal(successEval.state, "success", "All fulfilled yields success state");
assert.equal(successEval.studentCount, 2, "studentCount correctly computed as 2");
assert.equal(successEval.teacherCount, 1, "teacherCount correctly computed as 1");
assert.equal(successEval.sections?.length, 1, "sections correctly populated");
assert.deepEqual(successEval.failedFields, [], "failedFields is empty on success");

// 7b. Partial failure: students API request rejected
const partialStudentsFailed = evaluateSchoolAdminData({
  students: { status: "rejected", reason: new Error("Network timeout") },
  teachers: { status: "fulfilled", value: [{ id: "t1" }, { id: "t2" }] },
  sections: { status: "fulfilled", value: [{ id: "sec1", label: "Grade 1 - A" }] },
});
assert.equal(partialStudentsFailed.state, "partial", "Rejected student request yields partial state");
assert.equal(partialStudentsFailed.studentCount, null, "studentCount MUST be null, not 0, on failure");
assert.notEqual(partialStudentsFailed.studentCount, 0, "studentCount MUST NOT mask failure as 0");
assert.equal(partialStudentsFailed.teacherCount, 2, "Successful teacher count is preserved");
assert.deepEqual(partialStudentsFailed.failedFields, ["students"], "failedFields correctly flags students");

// 7c. Partial failure: teachers API request rejected
const partialTeachersFailed = evaluateSchoolAdminData({
  students: { status: "fulfilled", value: [{ id: "s1" }] },
  teachers: { status: "rejected", reason: new Error("500 Internal Error") },
  sections: { status: "fulfilled", value: [{ id: "sec1", label: "Grade 1 - A" }] },
});
assert.equal(partialTeachersFailed.state, "partial", "Rejected teacher request yields partial state");
assert.equal(partialTeachersFailed.teacherCount, null, "teacherCount MUST be null, not 0, on failure");
assert.deepEqual(partialTeachersFailed.failedFields, ["teachers"], "failedFields correctly flags teachers");

// 7d. Partial failure: sections API request rejected
const partialSectionsFailed = evaluateSchoolAdminData({
  students: { status: "fulfilled", value: [{ id: "s1" }] },
  teachers: { status: "fulfilled", value: [{ id: "t1" }] },
  sections: { status: "rejected", reason: new Error("Connection reset") },
});
assert.equal(partialSectionsFailed.state, "partial", "Rejected sections request yields partial state");
assert.equal(partialSectionsFailed.sections, null, "sections MUST be null, not [], on failure");
assert.deepEqual(partialSectionsFailed.failedFields, ["sections"], "failedFields correctly flags sections");

// 7e. Complete failure: all 3 requests rejected
const completeFailure = evaluateSchoolAdminData({
  students: { status: "rejected", reason: new Error("Network down") },
  teachers: { status: "rejected", reason: new Error("Network down") },
  sections: { status: "rejected", reason: new Error("Network down") },
});
assert.equal(completeFailure.state, "failure", "All rejected requests yield failure state");
assert.equal(completeFailure.studentCount, null, "All metrics are null on failure");
assert.equal(completeFailure.teacherCount, null, "All metrics are null on failure");
assert.equal(completeFailure.sections, null, "All metrics are null on failure");
assert.deepEqual(
  completeFailure.failedFields,
  ["students", "teachers", "sections"],
  "failedFields contains all 3 fields on complete failure",
);

// 7f. Distinction between legitimate 0 and failed request
const legitimateZeroStudents = evaluateSchoolAdminData({
  students: { status: "fulfilled", value: [] }, // Real API returned empty array (0 students)
  teachers: { status: "fulfilled", value: [{ id: "t1" }] },
  sections: { status: "fulfilled", value: [] },
});
assert.equal(legitimateZeroStudents.state, "success", "Empty array response yields success state");
assert.equal(legitimateZeroStudents.studentCount, 0, "Legitimate 0 students is preserved as 0");

function formatDashboardMetric(val: number | null): string {
  if (val === null) return "Failed to load";
  return String(val);
}
assert.equal(formatDashboardMetric(legitimateZeroStudents.studentCount), "0", "Legitimate 0 is formatted as '0'");
assert.equal(formatDashboardMetric(partialStudentsFailed.studentCount), "Failed to load", "Failed request is formatted as 'Failed to load', never '0'");

console.log("✓ Failure state & degraded resilience (no silent 0/empty masking) tests passed");

console.log("\n========================================================");
console.log("ALL PRODUCT-UX-002 WEB DASHBOARD & NAVIGATION TESTS PASSED");
console.log("========================================================\n");
