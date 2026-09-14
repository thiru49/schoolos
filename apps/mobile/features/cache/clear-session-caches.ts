import type { AclPayload, LinkedChild, RoleCode } from "@schoolos/types";
import { clearCachedCommunications } from "../communications/communications-cache";
import { clearCachedFees } from "../fees/fees-cache";
import { clearCachedTimetable } from "../timetable/timetable-cache";

export type SessionCacheContext = {
  schoolId?: string | null;
  userId?: string | null;
  /** Roles whose cache partitions should be purged (e.g. all assigned roles). */
  roles?: string[];
  /** Linked child student IDs whose parent-scoped partitions should be purged. */
  childIds?: string[];
};

/**
 * Purges offline feature caches for the given session context.
 * Safe to call with partial context — skips when schoolId/userId are missing.
 */
export async function clearSessionCaches(ctx: SessionCacheContext): Promise<void> {
  const { schoolId, userId, roles = [], childIds = [] } = ctx;
  if (!schoolId || !userId || roles.length === 0) {
    return;
  }

  for (const role of roles) {
    await clearCachedCommunications(schoolId, userId, role);
    await clearCachedFees(schoolId, userId, role);
    await clearCachedTimetable(schoolId, userId, role);

    for (const childId of childIds) {
      await clearCachedCommunications(schoolId, userId, role, childId);
      await clearCachedFees(schoolId, userId, role, childId);
      await clearCachedTimetable(schoolId, userId, role, childId);
    }
  }
}

/** Builds cache purge context from current in-memory session state. */
export function buildSessionCacheContext(
  acl: AclPayload | null | undefined,
  activeRole: RoleCode | null | undefined,
  selectedChild?: LinkedChild | null,
): SessionCacheContext | undefined {
  if (!acl?.schoolId || !acl.userId) {
    return undefined;
  }

  const roles = activeRole
    ? Array.from(new Set([activeRole, ...acl.roles]))
    : acl.roles;

  const childIds = selectedChild?.studentId ? [selectedChild.studentId] : [];

  return {
    schoolId: acl.schoolId,
    userId: acl.userId,
    roles,
    childIds,
  };
}
