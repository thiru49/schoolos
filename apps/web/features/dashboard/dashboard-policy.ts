import { PERMISSIONS, ROLE_CODES, type RoleCode, type PermissionCode } from "@schoolos/permissions";

export type DashboardRole = "school_super_admin" | "school_admin" | "accounts_admin" | "teacher" | "other";

export interface DashboardUserAcl {
  roles: RoleCode[];
  permissions: PermissionCode[];
}

export const SUPPORTED_DASHBOARD_ROLES: DashboardRole[] = [
  "school_super_admin",
  "school_admin",
  "accounts_admin",
  "teacher",
];

export const DASHBOARD_ROLE_LABELS: Record<DashboardRole, { en: string; ta: string }> = {
  school_super_admin: { en: "Super Admin", ta: "முதன்மை நிர்வாகி" },
  school_admin: { en: "School Admin", ta: "பள்ளி நிர்வாகி" },
  accounts_admin: { en: "Accounts Admin", ta: "கணக்கு நிர்வாகி" },
  teacher: { en: "Teacher", ta: "ஆசிரியர்" },
  other: { en: "General", ta: "பொது" },
};

/**
 * Deterministically resolves the default initial landing dashboard view
 * based on role hierarchy.
 */
export function resolveDefaultDashboardRole(roles: RoleCode[]): DashboardRole {
  if (roles.includes(ROLE_CODES.SCHOOL_SUPER_ADMIN)) return "school_super_admin";
  if (roles.includes(ROLE_CODES.SCHOOL_ADMIN) || roles.includes(ROLE_CODES.ACADEMIC_ADMIN)) return "school_admin";
  if (roles.includes(ROLE_CODES.ACCOUNTS_ADMIN)) return "accounts_admin";
  if (roles.includes(ROLE_CODES.TEACHER)) return "teacher";
  return "other";
}

/**
 * Returns list of distinct dashboard views accessible to the user based on their roles.
 */
export function getAvailableDashboardRoles(roles: RoleCode[]): DashboardRole[] {
  const available: DashboardRole[] = [];
  if (roles.includes(ROLE_CODES.SCHOOL_SUPER_ADMIN)) {
    available.push("school_super_admin");
  }
  if (roles.includes(ROLE_CODES.SCHOOL_ADMIN) || roles.includes(ROLE_CODES.ACADEMIC_ADMIN)) {
    available.push("school_admin");
  }
  if (roles.includes(ROLE_CODES.ACCOUNTS_ADMIN)) {
    available.push("accounts_admin");
  }
  if (roles.includes(ROLE_CODES.TEACHER)) {
    available.push("teacher");
  }
  return available;
}

export function canAccessFees(acl: { permissions: PermissionCode[] }): boolean {
  return acl.permissions.includes(PERMISSIONS.FEES_READ);
}

export function canAccessSettings(acl: { permissions: PermissionCode[] }): boolean {
  return acl.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_READ);
}

export function canManageRoles(acl: { permissions: PermissionCode[] }): boolean {
  return acl.permissions.includes(PERMISSIONS.ROLES_ASSIGN);
}

export function canManageAcademicYears(acl: { permissions: PermissionCode[] }): boolean {
  return acl.permissions.includes(PERMISSIONS.ACADEMIC_YEAR_MANAGE);
}

export function canManageClasses(acl: { permissions: PermissionCode[] }): boolean {
  return acl.permissions.includes(PERMISSIONS.CLASSES_MANAGE);
}

export interface EvaluatedSchoolAdminData {
  state: "success" | "partial" | "failure";
  studentCount: number | null;
  teacherCount: number | null;
  sections: { id: string; label: string }[] | null;
  failedFields: string[];
}

/**
 * Distinguishes success, partial failure, and complete failure for school admin metrics.
 * Ensures rejected requests are NEVER converted to valid 0/empty numbers.
 */
export function evaluateSchoolAdminData(results: {
  students: PromiseSettledResult<unknown[]>;
  teachers: PromiseSettledResult<unknown[]>;
  sections: PromiseSettledResult<{ id: string; label: string }[]>;
}): EvaluatedSchoolAdminData {
  const failedFields: string[] = [];

  let studentCount: number | null = null;
  if (results.students.status === "fulfilled") {
    studentCount = results.students.value.length;
  } else {
    failedFields.push("students");
  }

  let teacherCount: number | null = null;
  if (results.teachers.status === "fulfilled") {
    teacherCount = results.teachers.value.length;
  } else {
    failedFields.push("teachers");
  }

  let sections: { id: string; label: string }[] | null = null;
  if (results.sections.status === "fulfilled") {
    sections = results.sections.value;
  } else {
    failedFields.push("sections");
  }

  if (failedFields.length === 3) {
    return {
      state: "failure",
      studentCount: null,
      teacherCount: null,
      sections: null,
      failedFields,
    };
  }

  if (failedFields.length > 0) {
    return {
      state: "partial",
      studentCount,
      teacherCount,
      sections,
      failedFields,
    };
  }

  return {
    state: "success",
    studentCount,
    teacherCount,
    sections,
    failedFields: [],
  };
}
