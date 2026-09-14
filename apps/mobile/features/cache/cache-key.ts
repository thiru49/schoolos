/**
 * Builds a partitioned SecureStore key scoped by tenant schoolId, userId, role,
 * and optional childId. Fails closed when required auth context is missing.
 */
export function buildPartitionedCacheKey(
  prefix: string,
  schoolId?: string | null,
  userId?: string | null,
  role?: string | null,
  childId?: string | null,
): string | null {
  if (!schoolId || !userId || !role) {
    return null;
  }
  const parts = [schoolId, userId, role];
  if (childId) {
    parts.push(childId);
  }
  const raw = parts.join("_");
  const sanitized = raw.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${prefix}${sanitized}`;
}
