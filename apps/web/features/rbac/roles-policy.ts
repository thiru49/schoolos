import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";

export interface RolesAcl {
  roles?: readonly string[] | string[];
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

export function hasSchoolScope(acl: RolesAcl): boolean {
  return acl.scopes.some((s) => s.type === "school");
}

export function canViewRoles(acl: RolesAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.ROLES_ASSIGN);
}

export function canAssignRoles(acl: RolesAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.ROLES_ASSIGN) && hasSchoolScope(acl);
}

export function canGrantRole(
  acl: RolesAcl,
  role: { code: string; permissions: string[] },
): boolean {
  if (role.code === ROLE_CODES.PLATFORM_OWNER || role.code === "platform_owner") {
    return false;
  }
  const callerPerms = new Set(acl.permissions);
  return role.permissions.every((p) => callerPerms.has(p));
}

export function checkRolesRouteAccess(
  route: string,
  acl: RolesAcl,
): { allowed: boolean; reason?: string } {
  if (route.startsWith("/roles")) {
    if (!canAssignRoles(acl)) {
      return {
        allowed: false,
        reason: "Missing permission roles.assign or school scope",
      };
    }
    return { allowed: true };
  }
  return { allowed: false, reason: "Unknown route" };
}

export function validateScopeInput(scope: {
  scopeType: string;
  classId?: string | null;
  sectionId?: string | null;
  subjectId?: string | null;
  studentId?: string | null;
}): { valid: boolean; error?: string } {
  switch (scope.scopeType) {
    case "school":
      if (scope.classId || scope.sectionId || scope.subjectId || scope.studentId) {
        return { valid: false, error: "School scope must not specify class, section, subject, or student" };
      }
      return { valid: true };
    case "class":
      if (!scope.classId || scope.sectionId || scope.subjectId || scope.studentId) {
        return { valid: false, error: "Class scope requires class and must not specify section, subject, or student" };
      }
      return { valid: true };
    case "section":
      if (!scope.classId || !scope.sectionId || scope.subjectId || scope.studentId) {
        return { valid: false, error: "Section scope requires class and section, and must not specify subject or student" };
      }
      return { valid: true };
    case "subject":
      if (!scope.classId || !scope.sectionId || !scope.subjectId || scope.studentId) {
        return { valid: false, error: "Subject scope requires class, section, and subject, and must not specify student" };
      }
      return { valid: true };
    case "self":
    case "children":
      if (!scope.studentId || scope.classId || scope.sectionId || scope.subjectId) {
        return { valid: false, error: `${scope.scopeType} scope requires student and must not specify class, section, or subject` };
      }
      return { valid: true };
    default:
      return { valid: false, error: `Unsupported scope type: ${scope.scopeType}` };
  }
}
