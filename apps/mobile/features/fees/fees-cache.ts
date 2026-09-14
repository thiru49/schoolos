import { buildPartitionedCacheKey } from "../cache/cache-key";
import { createSecureStoreBackend, type KeyValueStorage } from "../cache/cache-storage";

export type CachedSummary = {
  studentId: string;
  studentName: string;
  headsTotal: number;
  paidTotal: number;
  dues: number;
};

export type CachedFeeRow = {
  id: string;
  amount: number;
  method: string;
  feeHeadName: string;
  receiptNumber: string | null;
  receiptId: string | null;
  createdAt: string;
};

export type CachedFeesData = {
  schoolId: string;
  userId: string;
  role: string;
  childId?: string;
  summary: CachedSummary;
  rows: CachedFeeRow[];
  cachedAt: string;
};

const CACHE_PREFIX = "schoolos_fees_";

let storageBackend: KeyValueStorage | null = null;

export function setFeesStorageBackend(backend: KeyValueStorage | null) {
  storageBackend = backend;
}

function getStorage(): KeyValueStorage | null {
  if (storageBackend) return storageBackend;
  return createSecureStoreBackend();
}

export function buildFeesCacheKey(
  schoolId?: string | null,
  userId?: string | null,
  role?: string | null,
  childId?: string | null,
): string | null {
  return buildPartitionedCacheKey(CACHE_PREFIX, schoolId, userId, role, childId);
}

export async function getCachedFees(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  childId?: string | null,
): Promise<CachedFeesData | null> {
  const key = buildFeesCacheKey(schoolId, userId, role, childId);
  if (!key) return null;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.getItemAsync !== "function") return null;

    const raw = await storage.getItemAsync(key);
    if (!raw) return null;

    const data = JSON.parse(raw) as CachedFeesData;
    const normalizedChildId = childId || undefined;
    const payloadChildId = data?.childId || undefined;

    if (
      !data ||
      typeof data !== "object" ||
      data.schoolId !== schoolId ||
      data.userId !== userId ||
      data.role !== role ||
      payloadChildId !== normalizedChildId ||
      !data.summary ||
      !Array.isArray(data.rows)
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function setCachedFees(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  data: { summary: CachedSummary; rows: CachedFeeRow[] },
  childId?: string | null,
): Promise<void> {
  const key = buildFeesCacheKey(schoolId, userId, role, childId);
  if (!key || !schoolId || !userId || !role) return;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.setItemAsync !== "function") return;

    const payload: CachedFeesData = {
      schoolId,
      userId,
      role,
      childId: childId || undefined,
      summary: data.summary,
      rows: data.rows,
      cachedAt: new Date().toISOString(),
    };
    await storage.setItemAsync(key, JSON.stringify(payload));
  } catch {
    // Ignore storage failures
  }
}

export async function clearCachedFees(
  schoolId: string | null | undefined,
  userId: string | null | undefined,
  role: string | null | undefined,
  childId?: string | null,
): Promise<void> {
  const key = buildFeesCacheKey(schoolId, userId, role, childId);
  if (!key) return;

  try {
    const storage = getStorage();
    if (!storage || typeof storage.deleteItemAsync !== "function") return;
    await storage.deleteItemAsync(key);
  } catch {
    // Ignore purge errors
  }
}
