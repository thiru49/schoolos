import { buildPartitionedCacheKey } from "../cache/cache-key";
import { createSecureStoreBackend, type KeyValueStorage } from "../cache/cache-storage";

export type CachedPeriod = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  subjectName: string;
  teacherName: string;
  label?: string;
  published?: boolean;
  subjectId?: string;
  teacherId?: string;
  sectionId?: string;
  classId?: string;
};

export type CachedTimetableData = {
  schoolId: string;
  userId: string;
  role: string;
  childId?: string;
  periods: CachedPeriod[];
  cachedAt: string;
};

const CACHE_PREFIX = "schoolos_timetable_";

let storageBackend: KeyValueStorage | null = null;

export function setTimetableStorageBackend(backend: KeyValueStorage | null) {
  storageBackend = backend;
}

function getStorage(): KeyValueStorage | null {
  if (storageBackend) return storageBackend;
  return createSecureStoreBackend();
}

export function buildTimetableCacheKey(
  schoolId?: string | null,
  userId?: string | null,
  role?: string | null,
  childId?: string | null,
): string | null {
  return buildPartitionedCacheKey(CACHE_PREFIX, schoolId, userId, role, childId);
}

/**
 * Retrieve cached timetable data for the current session partition.
 * Validates payload matches schoolId, userId, role, and childId before returning.
 */
export async function getCachedTimetable(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  childId?: string | null,
): Promise<CachedTimetableData | null> {
  const key = buildTimetableCacheKey(schoolId, userId, role, childId);
  if (!key) return null;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.getItemAsync !== "function") return null;

    const raw = await storage.getItemAsync(key);
    if (!raw) return null;

    const data = JSON.parse(raw) as CachedTimetableData;
    const normalizedChildId = childId || undefined;
    const payloadChildId = data?.childId || undefined;

    if (
      !data ||
      typeof data !== "object" ||
      data.schoolId !== schoolId ||
      data.userId !== userId ||
      data.role !== role ||
      payloadChildId !== normalizedChildId ||
      !Array.isArray(data.periods)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function setCachedTimetable(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  periods: CachedPeriod[],
  childId?: string | null,
): Promise<void> {
  const key = buildTimetableCacheKey(schoolId, userId, role, childId);
  if (!key || !schoolId || !userId || !role) return;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.setItemAsync !== "function") return;

    const payload: CachedTimetableData = {
      schoolId,
      userId,
      role,
      childId: childId || undefined,
      periods,
      cachedAt: new Date().toISOString(),
    };
    await storage.setItemAsync(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures
  }
}

export async function clearCachedTimetable(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  childId?: string | null,
): Promise<void> {
  const key = buildTimetableCacheKey(schoolId, userId, role, childId);
  if (!key) return;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.deleteItemAsync !== "function") return;
    await storage.deleteItemAsync(key);
  } catch {
    // Ignore purge errors
  }
}
