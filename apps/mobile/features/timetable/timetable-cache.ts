import * as SecureStore from "expo-secure-store";

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
  studentId: string;
  periods: CachedPeriod[];
  cachedAt: string;
};

const CACHE_PREFIX = "schoolos_timetable_";

/**
 * Retrieve cached timetable data for a given student/child scope.
 * Guarantees that data is only returned if the scoped studentId matches.
 */
export async function getCachedTimetable(
  scopeKey: string,
  expectedStudentId: string,
): Promise<CachedTimetableData | null> {
  try {
    const raw = await SecureStore.getItemAsync(`${CACHE_PREFIX}${scopeKey}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedTimetableData;
    // Strict partition and structural check:
    // - data must exist and be an object
    // - studentId must strictly match the active child/user to prevent cross-account/sibling leaks
    // - periods must be a valid array
    if (
      !data ||
      typeof data !== "object" ||
      data.studentId !== expectedStudentId ||
      !Array.isArray(data.periods)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Save timetable periods to persistent cache scoped by student/child.
 */
export async function setCachedTimetable(
  scopeKey: string,
  studentId: string,
  periods: CachedPeriod[],
): Promise<void> {
  try {
    const payload: CachedTimetableData = {
      studentId,
      periods,
      cachedAt: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(`${CACHE_PREFIX}${scopeKey}`, JSON.stringify(payload));
  } catch {
    // Ignore storage failures
  }
}
