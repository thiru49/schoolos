import { PERMISSIONS } from "@schoolos/permissions";

export interface AcademicsAcl {
  permissions: readonly string[] | string[];
  scopes: readonly { type: string }[];
}

export function hasSchoolScope(acl: AcademicsAcl): boolean {
  return acl.scopes.some((s) => s.type === "school");
}

export function canManageAcademicYears(acl: AcademicsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.ACADEMIC_YEAR_MANAGE) && hasSchoolScope(acl);
}

export function canManageClasses(acl: AcademicsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.CLASSES_MANAGE) && hasSchoolScope(acl);
}

export function canManageSubjects(acl: AcademicsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.SUBJECTS_MANAGE) && hasSchoolScope(acl);
}

export function checkAcademicsRouteAccess(
  route: string,
  acl: AcademicsAcl,
): { allowed: boolean; reason?: string } {
  switch (route) {
    case "/academic-years":
      if (!canManageAcademicYears(acl)) {
        return { allowed: false, reason: "Missing permission academic_year.manage" };
      }
      return { allowed: true };
    case "/classes":
      if (!canManageClasses(acl)) {
        return { allowed: false, reason: "Missing permission classes.manage" };
      }
      return { allowed: true };
    case "/subjects":
      if (!canManageSubjects(acl)) {
        return { allowed: false, reason: "Missing permission subjects.manage" };
      }
      return { allowed: true };
    default:
      return { allowed: false, reason: "Unknown academics route" };
  }
}
