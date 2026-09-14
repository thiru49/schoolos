import assert from "node:assert/strict";
import { buildPartitionedCacheKey } from "../features/cache/cache-key";
import {
  buildSessionCacheContext,
  clearSessionCaches,
} from "../features/cache/clear-session-caches";
import type { KeyValueStorage } from "../features/cache/cache-storage";
import {
  buildFeesCacheKey,
  clearCachedFees,
  getCachedFees,
  setCachedFees,
  setFeesStorageBackend,
} from "../features/fees/fees-cache";
import {
  buildTimetableCacheKey,
  clearCachedTimetable,
  getCachedTimetable,
  setCachedTimetable,
  setTimetableStorageBackend,
} from "../features/timetable/timetable-cache";
import {
  getCachedCommunications,
  setCachedCommunications,
  setCommunicationsStorageBackend,
} from "../features/communications/communications-cache";
import type { AclPayload } from "@schoolos/types";

function setupMockStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const backend: KeyValueStorage = {
    async getItemAsync(key: string) {
      return store.get(key) ?? null;
    },
    async setItemAsync(key: string, value: string) {
      store.set(key, value);
    },
    async deleteItemAsync(key: string) {
      store.delete(key);
    },
  };
  setFeesStorageBackend(backend);
  setTimetableStorageBackend(backend);
  setCommunicationsStorageBackend(backend);
  return store;
}

function sampleAcl(overrides: Partial<AclPayload> = {}): AclPayload {
  return {
    userId: "user-1",
    schoolId: "school-a",
    roles: ["parent", "teacher"],
    permissions: [],
    scopes: [],
    ...overrides,
  };
}

function testSharedCacheKeyPartitioning() {
  const keySchoolA = buildPartitionedCacheKey("schoolos_test_", "school-a", "user-1", "parent");
  const keySchoolB = buildPartitionedCacheKey("schoolos_test_", "school-b", "user-1", "parent");
  const keyUser2 = buildPartitionedCacheKey("schoolos_test_", "school-a", "user-2", "parent");
  const keyRoleStudent = buildPartitionedCacheKey("schoolos_test_", "school-a", "user-1", "student");
  const keyWithChild = buildPartitionedCacheKey(
    "schoolos_test_",
    "school-a",
    "user-1",
    "parent",
    "child-1",
  );

  assert.ok(keySchoolA);
  assert.notEqual(keySchoolA, keySchoolB, "Different schools must not share cache keys");
  assert.notEqual(keySchoolA, keyUser2, "Different users must not share cache keys");
  assert.notEqual(keySchoolA, keyRoleStudent, "Different roles must not share cache keys");
  assert.notEqual(keySchoolA, keyWithChild, "Child-scoped keys must differ from unscoped keys");
  assert.equal(buildPartitionedCacheKey("p_", "", "u1", "parent"), null);
  assert.equal(buildPartitionedCacheKey("p_", "s1", null, "parent"), null);
  assert.equal(buildPartitionedCacheKey("p_", "s1", "u1", ""), null);

  console.log("✓ Shared cache key partitioning tests passed");
}

function testFeesAndTimetableKeyPrefixes() {
  const feesKey = buildFeesCacheKey("school-a", "user-1", "student");
  const timetableKey = buildTimetableCacheKey("school-a", "user-1", "student");

  assert.ok(feesKey?.startsWith("schoolos_fees_"));
  assert.ok(timetableKey?.startsWith("schoolos_timetable_"));
  assert.notEqual(feesKey, timetableKey, "Feature prefixes must isolate namespaces");

  console.log("✓ Fees and timetable cache key prefix tests passed");
}

async function testFeesCrossTenantIsolation() {
  const store = setupMockStorage();

  const summary = {
    studentId: "student-1",
    studentName: "Student One",
    headsTotal: 1000,
    paidTotal: 500,
    dues: 500,
  };

  await setCachedFees("school-a", "user-1", "parent", { summary, rows: [] }, "child-1");
  assert.equal(store.size, 1);

  const sameContext = await getCachedFees("school-a", "user-1", "parent", "child-1");
  assert.ok(sameContext);
  assert.equal(sameContext.schoolId, "school-a");

  assert.equal(await getCachedFees("school-b", "user-1", "parent", "child-1"), null);
  assert.equal(await getCachedFees("school-a", "user-2", "parent", "child-1"), null);
  assert.equal(await getCachedFees("school-a", "user-1", "parent", "child-2"), null);
  assert.equal(await getCachedFees("school-a", "user-1", "teacher"), null);

  await setCachedFees("", "user-1", "parent", { summary, rows: [] });
  assert.equal(store.size, 1, "Incomplete auth context must not write fees cache");

  console.log("✓ Fees cross-tenant isolation tests passed");
}

async function testTimetableCrossTenantIsolation() {
  setupMockStorage();

  const periods = [
    {
      id: "p1",
      weekday: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectName: "Math",
      teacherName: "Teacher A",
    },
  ];

  await setCachedTimetable("school-a", "user-1", "student", periods);
  const cached = await getCachedTimetable("school-a", "user-1", "student");
  assert.ok(cached);
  assert.equal(cached.periods.length, 1);

  assert.equal(await getCachedTimetable("school-b", "user-1", "student"), null);
  assert.equal(await getCachedTimetable("school-a", "user-2", "student"), null);
  assert.equal(await getCachedTimetable("school-a", "user-1", "parent"), null);

  console.log("✓ Timetable cross-tenant isolation tests passed");
}

async function testClearSessionCachesPurgesPartitions() {
  const store = setupMockStorage();

  await setCachedFees(
    "school-a",
    "user-1",
    "parent",
    {
      summary: {
        studentId: "child-1",
        studentName: "Child",
        headsTotal: 0,
        paidTotal: 0,
        dues: 0,
      },
      rows: [],
    },
    "child-1",
  );
  await setCachedTimetable("school-a", "user-1", "parent", [], "child-1");
  await setCachedCommunications(
    "school-a",
    "user-1",
    "parent",
    { notices: [], events: [], holidays: [], notifications: [] },
    "child-1",
  );

  assert.equal(store.size, 3);

  await clearSessionCaches({
    schoolId: "school-a",
    userId: "user-1",
    roles: ["parent"],
    childIds: ["child-1"],
  });

  assert.equal(store.size, 0, "Session cache purge must remove all feature partitions");
  assert.equal(await getCachedFees("school-a", "user-1", "parent", "child-1"), null);
  assert.equal(await getCachedTimetable("school-a", "user-1", "parent", "child-1"), null);
  assert.equal(await getCachedCommunications("school-a", "user-1", "parent", "child-1"), null);

  console.log("✓ clearSessionCaches purge tests passed");
}

function testBuildSessionCacheContext() {
  const ctx = buildSessionCacheContext(sampleAcl(), "parent", {
    studentId: "child-1",
    fullName: "Child",
    admissionNumber: "A1",
    className: "5",
    sectionName: "A",
  });

  assert.ok(ctx);
  assert.equal(ctx?.schoolId, "school-a");
  assert.equal(ctx?.userId, "user-1");
  assert.deepEqual(ctx?.roles, ["parent", "teacher"]);
  assert.deepEqual(ctx?.childIds, ["child-1"]);

  assert.equal(buildSessionCacheContext(null, "parent"), undefined);

  console.log("✓ buildSessionCacheContext tests passed");
}

async function testPerPartitionClearHelpers() {
  const store = setupMockStorage();

  await setCachedFees("school-a", "user-1", "student", {
    summary: {
      studentId: "self",
      studentName: "Self",
      headsTotal: 0,
      paidTotal: 0,
      dues: 0,
    },
    rows: [],
  });
  await setCachedTimetable("school-a", "user-1", "student", []);

  assert.equal(store.size, 2);

  await clearCachedFees("school-a", "user-1", "student");
  assert.equal(store.size, 1);
  await clearCachedTimetable("school-a", "user-1", "student");
  assert.equal(store.size, 0);

  console.log("✓ Per-partition clear helper tests passed");
}

async function main() {
  console.log("Starting MOB-UX-001 mobile offline cache partition tests...");

  testSharedCacheKeyPartitioning();
  testFeesAndTimetableKeyPrefixes();
  testBuildSessionCacheContext();
  await testFeesCrossTenantIsolation();
  await testTimetableCrossTenantIsolation();
  await testClearSessionCachesPurgesPartitions();
  await testPerPartitionClearHelpers();

  console.log("\n✓ MOB-UX-001 mobile offline cache partition tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
