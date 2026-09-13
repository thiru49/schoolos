import { PERMISSIONS } from "@schoolos/permissions";

export interface CommunicationsAcl {
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

export function hasSchoolScope(acl: CommunicationsAcl): boolean {
  return acl.scopes.some((s) => s.type === "school");
}

export function canReadNotices(acl: CommunicationsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.NOTICES_READ);
}

export function canWriteNotices(acl: CommunicationsAcl): boolean {
  return (
    acl.permissions.includes(PERMISSIONS.NOTICES_WRITE) &&
    hasSchoolScope(acl)
  );
}

export function canReadEvents(acl: CommunicationsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.EVENTS_READ);
}

export function canWriteEvents(acl: CommunicationsAcl): boolean {
  return (
    acl.permissions.includes(PERMISSIONS.EVENTS_WRITE) &&
    hasSchoolScope(acl)
  );
}

export function canReadHolidays(acl: CommunicationsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.NOTICES_READ);
}

export function canManageHolidays(acl: CommunicationsAcl): boolean {
  return (
    acl.permissions.includes(PERMISSIONS.HOLIDAYS_MANAGE) &&
    hasSchoolScope(acl)
  );
}

export function checkCommunicationsRouteAccess(
  route: string,
  acl: CommunicationsAcl
): { allowed: boolean; reason?: string } {
  switch (route) {
    case "/notices":
      if (!canReadNotices(acl)) {
        return { allowed: false, reason: "Missing permission notices.read" };
      }
      return { allowed: true };

    case "/events":
      if (!canReadEvents(acl)) {
        return { allowed: false, reason: "Missing permission events.read" };
      }
      return { allowed: true };

    case "/holidays":
      if (!canReadHolidays(acl)) {
        return { allowed: false, reason: "Missing permission notices.read" };
      }
      return { allowed: true };

    default:
      return { allowed: false, reason: "Unknown communications route" };
  }
}
