import * as SecureStore from "expo-secure-store";
import { buildCommunicationsCacheKey } from "./communications-logic";
import type {
  CachedCommunicationsData,
  MobileEventItem,
  MobileHolidayItem,
  MobileNoticeItem,
  MobileNotificationItem,
} from "./communications-types";

export { buildCommunicationsCacheKey };

/**
 * Retrieves cached communications data. Validates that the cached payload
 * matches the current session context exactly (schoolId, userId, role)
 * before returning it, preventing any cross-tenant, cross-account, or cross-role leaks.
 */
export async function getCachedCommunications(
  schoolId: string,
  userId: string,
  role: string,
): Promise<CachedCommunicationsData | null> {
  try {
    const key = buildCommunicationsCacheKey(schoolId, userId, role);
    let raw: string | null = null;
    if (typeof SecureStore.getItemAsync === "function") {
      raw = await SecureStore.getItemAsync(key);
    }
    if (!raw) return null;

    const data = JSON.parse(raw) as CachedCommunicationsData;
    if (
      !data ||
      typeof data !== "object" ||
      data.schoolId !== schoolId ||
      data.userId !== userId ||
      data.role !== role ||
      !Array.isArray(data.notices) ||
      !Array.isArray(data.events) ||
      !Array.isArray(data.holidays) ||
      !Array.isArray(data.notifications)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Persists communications data in SecureStore under the partitioned key.
 */
export async function setCachedCommunications(
  schoolId: string,
  userId: string,
  role: string,
  data: {
    notices: MobileNoticeItem[];
    events: MobileEventItem[];
    holidays: MobileHolidayItem[];
    notifications: MobileNotificationItem[];
  },
): Promise<void> {
  try {
    const key = buildCommunicationsCacheKey(schoolId, userId, role);
    const payload: CachedCommunicationsData = {
      schoolId,
      userId,
      role,
      notices: data.notices,
      events: data.events,
      holidays: data.holidays,
      notifications: data.notifications,
      cachedAt: new Date().toISOString(),
    };
    if (typeof SecureStore.setItemAsync === "function") {
      await SecureStore.setItemAsync(key, JSON.stringify(payload));
    }
  } catch {
    // Ignore storage errors in offline or restricted environments
  }
}

/**
 * Purges cached communications for a specific session partition.
 */
export async function clearCachedCommunications(
  schoolId: string,
  userId: string,
  role: string,
): Promise<void> {
  try {
    const key = buildCommunicationsCacheKey(schoolId, userId, role);
    if (typeof SecureStore.deleteItemAsync === "function") {
      await SecureStore.deleteItemAsync(key);
    }
  } catch {
    // Ignore purge errors
  }
}
