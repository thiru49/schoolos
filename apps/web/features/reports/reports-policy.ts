import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";

export interface ReportAcl {
  roles: readonly string[] | string[];
  permissions: readonly string[] | string[];
  scopes: readonly {
    type: string;
    schoolId?: string;
    classId?: string;
    sectionId?: string;
    subjectId?: string;
    studentId?: string;
  }[];
}

export const REPORT_ADMIN_ROLES: readonly string[] = [
  ROLE_CODES.SCHOOL_SUPER_ADMIN,
  ROLE_CODES.SCHOOL_ADMIN,
  ROLE_CODES.ACADEMIC_ADMIN,
];

export function hasSchoolScope(acl: ReportAcl): boolean {
  return acl.scopes.some((s) => s.type === "school");
}

export function hasAdminRole(acl: ReportAcl): boolean {
  return acl.roles.some((r) => (REPORT_ADMIN_ROLES as readonly string[]).includes(r));
}

export function isTeacherOnly(acl: ReportAcl): boolean {
  return acl.roles.includes(ROLE_CODES.TEACHER) && !hasAdminRole(acl);
}

export function canAccessAttendance(acl: ReportAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE);
}

export function canAccessProgress(acl: ReportAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);
}

export function canAccessFees(acl: ReportAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.REPORTS_FEES) && hasSchoolScope(acl);
}

export function canAccessStudentList(acl: ReportAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);
}

export type TeacherWorkloadAccessResult = {
  allowed: boolean;
  isTeacherOnly: boolean;
  reason?: string;
};

export function checkTeacherWorkloadAccess(acl: ReportAcl): TeacherWorkloadAccessResult {
  const admin = hasAdminRole(acl);
  if (!admin) {
    if (acl.roles.includes(ROLE_CODES.TEACHER)) {
      return {
        allowed: false,
        isTeacherOnly: true,
        reason: "Teachers are not authorized to view the teacher workload report",
      };
    }
    return {
      allowed: false,
      isTeacherOnly: false,
      reason: "Teacher workload report requires administrative role",
    };
  }
  if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
    return {
      allowed: false,
      isTeacherOnly: false,
      reason: "Missing permission reports.progress",
    };
  }
  if (!hasSchoolScope(acl)) {
    return {
      allowed: false,
      isTeacherOnly: false,
      reason: "Teacher workload report requires school scope",
    };
  }
  return { allowed: true, isTeacherOnly: false };
}

export function canAccessTeacherWorkload(acl: ReportAcl): boolean {
  return checkTeacherWorkloadAccess(acl).allowed;
}

export function checkReportRouteAccess(
  route: string,
  acl: ReportAcl
): { allowed: boolean; reason?: string } {
  switch (route) {
    case "/reports/fee-collection":
    case "/reports/payments": {
      if (!acl.permissions.includes(PERMISSIONS.REPORTS_FEES)) {
        return { allowed: false, reason: "Missing permission reports.fees" };
      }
      if (!hasSchoolScope(acl)) {
        return { allowed: false, reason: "Fee reports require school scope" };
      }
      return { allowed: true };
    }

    case "/reports/teachers": {
      const res = checkTeacherWorkloadAccess(acl);
      return { allowed: res.allowed, reason: res.reason };
    }

    case "/reports/students": {
      if (!canAccessStudentList(acl)) {
        return { allowed: false, reason: "Student list report requires reports.progress permission" };
      }
      return { allowed: true };
    }

    case "/reports/progress": {
      if (!canAccessProgress(acl)) {
        return { allowed: false, reason: "Progress report requires progress reporting permissions" };
      }
      return { allowed: true };
    }

    case "/reports/attendance": {
      if (!canAccessAttendance(acl)) {
        return { allowed: false, reason: "Attendance report requires attendance reporting permissions" };
      }
      return { allowed: true };
    }

    default:
      return { allowed: false, reason: "Unknown report route" };
  }
}
