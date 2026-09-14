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
