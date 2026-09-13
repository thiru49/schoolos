import * as SecureStore from "expo-secure-store";

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
  summary: CachedSummary;
  rows: CachedFeeRow[];
  cachedAt: string;
};

const CACHE_PREFIX = "schoolos_fees_";

export async function getCachedFees(studentId: string): Promise<CachedFeesData | null> {
  try {
    const raw = await SecureStore.getItemAsync(`${CACHE_PREFIX}${studentId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedFeesData;
  } catch {
    return null;
  }
}

export async function setCachedFees(
  studentId: string,
  data: { summary: CachedSummary; rows: CachedFeeRow[] },
): Promise<void> {
  try {
    const payload: CachedFeesData = {
      summary: data.summary,
      rows: data.rows,
      cachedAt: new Date().toISOString(),
    };
    await SecureStore.setItemAsync(`${CACHE_PREFIX}${studentId}`, JSON.stringify(payload));
  } catch {
    // Ignore storage failures
  }
}
