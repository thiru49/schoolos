import { buildCommunicationsCacheKey } from "./communications-logic";
import type {
  CachedCommunicationsData,
  CommunicationsPayload,
} from "./communications-types";

export { buildCommunicationsCacheKey };

export type KeyValueStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

let storageBackend: KeyValueStorage | null = null;

export function setCommunicationsStorageBackend(backend: KeyValueStorage | null) {
  storageBackend = backend;
}

declare const require: any;

function getStorage(): KeyValueStorage | null {
  if (storageBackend) return storageBackend;
  try {
    return require("expo-secure-store");
  } catch {
    return null;
  }
}

/**
 * Retrieves cached communications data.
 * Validates that the cached payload matches the current session context exactly
 * (schoolId, userId, role, childId) before returning it, preventing any cross-tenant,
 * cross-account, or cross-child leaks. Fails closed (returns null) if auth context is missing.
 */
export async function getCachedCommunications(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  childId?: string | null,
): Promise<CachedCommunicationsData | null> {
  const key = buildCommunicationsCacheKey(schoolId, userId, role, childId);
  if (!key) return null;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.getItemAsync !== "function") return null;

    const raw = await storage.getItemAsync(key);
    if (!raw) return null;

    const data = JSON.parse(raw) as CachedCommunicationsData;
    const normalizedChildId = childId || undefined;
    const payloadChildId = data?.childId || undefined;

    if (
      !data ||
      typeof data !== "object" ||
      data.schoolId !== schoolId ||
      data.userId !== userId ||
      data.role !== role ||
      payloadChildId !== normalizedChildId ||
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
 * Persists communications data in storage under the partitioned key.
 * Fails closed (does not write) if any required auth context is missing.
 */
export async function setCachedCommunications(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  data: CommunicationsPayload,
  childId?: string | null,
): Promise<void> {
  const key = buildCommunicationsCacheKey(schoolId, userId, role, childId);
  if (!key || !schoolId || !userId || !role) return;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.setItemAsync !== "function") return;

    const payload: CachedCommunicationsData = {
      notices: data.notices,
      events: data.events,
      holidays: data.holidays,
      notifications: data.notifications,
      schoolId,
      userId,
      role,
      childId: childId || undefined,
      cachedAt: new Date().toISOString(),
    };
    await storage.setItemAsync(key, JSON.stringify(payload));
  } catch {
    // Ignore storage write errors in restricted environments
  }
}

/**
 * Updates the read state of a single notification in the existing cache partition
 * without deleting or wiping other cached items (notices, events, holidays, alerts).
 */
export async function updateCachedNotificationReadState(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  notificationId: string,
  read: boolean,
  childId?: string | null,
): Promise<boolean> {
  const key = buildCommunicationsCacheKey(schoolId, userId, role, childId);
  if (!key) return false;

  try {
    const cached = await getCachedCommunications(schoolId, userId, role, childId);
    if (!cached) return false;

    const updatedNotifications = cached.notifications.map((n) =>
      n.id === notificationId ? { ...n, read } : n,
    );

    await setCachedCommunications(
      schoolId,
      userId,
      role,
      {
        notices: cached.notices,
        events: cached.events,
        holidays: cached.holidays,
        notifications: updatedNotifications,
      },
      childId,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Purges cached communications for a specific session partition.
 */
export async function clearCachedCommunications(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  childId?: string | null,
): Promise<void> {
  const key = buildCommunicationsCacheKey(schoolId, userId, role, childId);
  if (!key) return;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.deleteItemAsync !== "function") return;
    await storage.deleteItemAsync(key);
  } catch {
    // Ignore purge errors
  }
}
