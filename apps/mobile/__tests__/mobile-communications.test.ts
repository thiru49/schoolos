import assert from "node:assert/strict";
import {
  formatAudienceLabel,
  formatNoticeDate,
  formatEventSchedule,
  isEventUpcoming,
  formatHolidayDate,
  sortHolidaysChronologically,
  buildCommunicationsCacheKey,
} from "../features/communications/communications-logic";
import {
  getCachedCommunications,
  setCachedCommunications,
  updateCachedNotificationReadState,
  clearCachedCommunications,
  setCommunicationsStorageBackend,
  type KeyValueStorage,
} from "../features/communications/communications-cache";
import type {
  MobileEventItem,
  MobileHolidayItem,
  MobileNoticeItem,
  MobileNotificationItem,
  CommunicationsPayload,
} from "../features/communications/communications-types";

console.log("Starting COM-003 Mobile Communications Unit & Validation Tests...");

// In-memory storage backend for testing real cache functions in Node/tsx
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
  setCommunicationsStorageBackend(backend);
  return store;
}

// 1. Audience presentation tests
function testAudiencePresentation() {
  const student = formatAudienceLabel("student");
  assert.equal(student.label, "Students");
  assert.equal(student.text, "#1d4ed8");

  const parent = formatAudienceLabel("parent");
  assert.equal(parent.label, "Parents");
  assert.equal(parent.text, "#7e22ce");

  const teacher = formatAudienceLabel("teacher");
  assert.equal(teacher.label, "Teachers");
  assert.equal(teacher.text, "#b45309");

  const everyoneNull = formatAudienceLabel(null as any);
  assert.equal(everyoneNull.label, "Everyone");
  assert.equal(everyoneNull.text, "#475569");

  const everyoneAll = formatAudienceLabel("all" as any);
  assert.equal(everyoneAll.label, "Everyone");

  // Date formatting
  const formattedDate = formatNoticeDate("2026-09-15T10:30:00.000Z");
  assert.ok(formattedDate.includes("2026"), "Formatted date includes year");
  assert.ok(formattedDate.includes("Sep"), "Formatted date includes month");

  assert.equal(formatNoticeDate(null), "");
  assert.equal(formatNoticeDate("invalid-date"), "");

  console.log("✓ Audience presentation and date formatting tests passed");
}

// 2. Upcoming vs Past event partitioning tests
function testEventPartitioning() {
  const refDate = new Date("2026-09-14T12:00:00.000Z");

  const upcomingEvent: MobileEventItem = {
    id: "evt-1",
    title: "Annual Sports Day",
    description: "Inter-school sports meet",
    startDate: "2026-09-20T09:00:00.000Z",
    endDate: "2026-09-20T17:00:00.000Z",
    location: "Main Ground",
    published: true,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  const pastEvent: MobileEventItem = {
    id: "evt-2",
    title: "Orientation Session",
    description: "Welcome for new academic year",
    startDate: "2026-08-01T09:00:00.000Z",
    endDate: "2026-08-01T12:00:00.000Z",
    location: "Auditorium",
    published: true,
    createdAt: "2026-07-20T00:00:00.000Z",
  };

  const ongoingEvent: MobileEventItem = {
    id: "evt-3",
    title: "Science Exhibition",
    description: "Three-day exhibition",
    startDate: "2026-09-13T09:00:00.000Z",
    endDate: "2026-09-15T17:00:00.000Z",
    location: "Lab Block",
    published: true,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  assert.equal(isEventUpcoming(upcomingEvent, refDate), true);
  assert.equal(isEventUpcoming(pastEvent, refDate), false);
  assert.equal(isEventUpcoming(ongoingEvent, refDate), true, "Ongoing multi-day event is upcoming");

  // Schedule range formatting
  const singleDayStr = formatEventSchedule(
    "2026-09-20T09:00:00.000Z",
    "2026-09-20T17:00:00.000Z",
  );
  assert.ok(singleDayStr.includes("Sep 20, 2026"));
  assert.ok(!singleDayStr.includes("–"), "Single day schedule does not have range separator");

  const multiDayStr = formatEventSchedule(
    "2026-09-13T09:00:00.000Z",
    "2026-09-15T17:00:00.000Z",
  );
  assert.ok(multiDayStr.includes("–"), "Multi-day schedule contains range separator");

  console.log("✓ Upcoming vs past event partitioning and schedule tests passed");
}

// 3. Holiday chronological ordering and date presentation tests
function testHolidayOrdering() {
  const unsortedHolidays: MobileHolidayItem[] = [
    { id: "h3", name: "Diwali", date: "2026-11-08", academicYearId: "ay-1", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "h1", name: "Independence Day", date: "2026-08-15", academicYearId: "ay-1", createdAt: "2026-06-01T00:00:00.000Z" },
    { id: "h2", name: "Gandhi Jayanti", date: "2026-10-02", academicYearId: "ay-1", createdAt: "2026-06-01T00:00:00.000Z" },
  ];

  const sorted = sortHolidaysChronologically(unsortedHolidays);
  assert.equal(sorted[0].id, "h1", "First holiday is Independence Day (Aug 15)");
  assert.equal(sorted[1].id, "h2", "Second holiday is Gandhi Jayanti (Oct 2)");
  assert.equal(sorted[2].id, "h3", "Third holiday is Diwali (Nov 8)");

  const { dayNumber, monthName, dayOfWeek, year } = formatHolidayDate("2026-08-15");
  assert.equal(dayNumber, "15");
  assert.equal(monthName, "Aug");
  assert.equal(dayOfWeek, "Saturday");
  assert.equal(year, "2026");

  console.log("✓ Holiday chronological ordering and calendar day calculation tests passed");
}

// 4. Cache-key partitioning across schools, users, and roles
function testCacheKeyPartitioning() {
  const keyTenantA_User1_Parent = buildCommunicationsCacheKey(
    "school-arulneri",
    "user-parent-1",
    "parent",
  );
  const keyTenantB_User1_Parent = buildCommunicationsCacheKey(
    "school-b",
    "user-parent-1",
    "parent",
  );
  const keyTenantA_User2_Student = buildCommunicationsCacheKey(
    "school-arulneri",
    "user-student-2",
    "student",
  );
  const keyTenantA_User1_Teacher = buildCommunicationsCacheKey(
    "school-arulneri",
    "user-parent-1",
    "teacher",
  );

  assert.ok(keyTenantA_User1_Parent);
  assert.ok(keyTenantB_User1_Parent);
  assert.ok(keyTenantA_User2_Student);
  assert.ok(keyTenantA_User1_Teacher);

  assert.notEqual(
    keyTenantA_User1_Parent,
    keyTenantB_User1_Parent,
    "Cross-tenant keys must never collide",
  );
  assert.notEqual(
    keyTenantA_User1_Parent,
    keyTenantA_User2_Student,
    "Cross-user keys must never collide",
  );
  assert.notEqual(
    keyTenantA_User1_Parent,
    keyTenantA_User1_Teacher,
    "Cross-role keys for same user must never collide",
  );

  // Key prefix guarantees namespacing
  assert.ok(keyTenantA_User1_Parent.startsWith("schoolos_comms_"));

  console.log("✓ Cache-key partitioning and multi-tenant separation tests passed");
}

// 5. Child cache partitioning tests
function testChildCachePartitioning() {
  const childA = "child-student-A";
  const childB = "child-student-B";

  const keyChildA = buildCommunicationsCacheKey("school-1", "user-parent-1", "parent", childA);
  const keyChildB = buildCommunicationsCacheKey("school-1", "user-parent-1", "parent", childB);
  const keyNoChild = buildCommunicationsCacheKey("school-1", "user-parent-1", "parent");

  assert.ok(keyChildA);
  assert.ok(keyChildB);
  assert.ok(keyNoChild);

  assert.notEqual(keyChildA, keyChildB, "Different active children must produce distinct cache partitions");
  assert.notEqual(keyChildA, keyNoChild, "Child-scoped key must not collide with un-scoped key");

  const keyChildA_Repeat = buildCommunicationsCacheKey("school-1", "user-parent-1", "parent", childA);
  assert.equal(keyChildA, keyChildA_Repeat, "Identical child session must reproduce identical key");

  console.log("✓ Child cache partitioning tests passed");
}

// 6. Missing auth context fails closed
async function testMissingAuthContextFailsClosed() {
  const store = setupMockStorage();

  // Missing schoolId
  assert.equal(buildCommunicationsCacheKey("", "u1", "parent"), null);
  assert.equal(buildCommunicationsCacheKey(null, "u1", "parent"), null);
  assert.equal(buildCommunicationsCacheKey(undefined, "u1", "parent"), null);

  // Missing userId
  assert.equal(buildCommunicationsCacheKey("s1", "", "parent"), null);
  assert.equal(buildCommunicationsCacheKey("s1", null, "parent"), null);
  assert.equal(buildCommunicationsCacheKey("s1", undefined, "parent"), null);

  // Missing role
  assert.equal(buildCommunicationsCacheKey("s1", "u1", ""), null);
  assert.equal(buildCommunicationsCacheKey("s1", "u1", null), null);
  assert.equal(buildCommunicationsCacheKey("s1", "u1", undefined), null);

  // Reading cache with missing auth context returns null
  assert.equal(await getCachedCommunications("", "u1", "parent"), null);
  assert.equal(await getCachedCommunications("s1", "", "parent"), null);
  assert.equal(await getCachedCommunications("s1", "u1", ""), null);

  // Writing cache with missing auth context is a no-op
  const sampleData: CommunicationsPayload = {
    notices: [],
    events: [],
    holidays: [],
    notifications: [],
  };
  await setCachedCommunications("", "u1", "parent", sampleData);
  await setCachedCommunications("s1", "", "parent", sampleData);
  await setCachedCommunications("s1", "u1", "", sampleData);
  assert.equal(store.size, 0, "No entries must be created in storage without complete auth context");

  // Valid write for child A
  await setCachedCommunications("school-1", "user-1", "parent", sampleData, "child-A");
  assert.equal(store.size, 1);

  // Reading back for child A succeeds
  const readChildA = await getCachedCommunications("school-1", "user-1", "parent", "child-A");
  assert.ok(readChildA);
  assert.equal(readChildA.childId, "child-A");

  // Reading with child B on child A's partition fails closed
  const readChildB = await getCachedCommunications("school-1", "user-1", "parent", "child-B");
  assert.equal(readChildB, null, "Child B must never read Child A cache partition");

  // Cross-tenant attempt fails closed
  const readTenantB = await getCachedCommunications("school-other", "user-1", "parent", "child-A");
  assert.equal(readTenantB, null, "Cross-tenant read must fail closed");

  // Cross-user attempt fails closed
  const readUser2 = await getCachedCommunications("school-1", "user-2", "parent", "child-A");
  assert.equal(readUser2, null, "Cross-user read must fail closed");

  console.log("✓ Missing auth context and cross-context isolation fail-closed tests passed");
}

// 7. Successful mark-read updates cache
async function testSuccessfulMarkReadUpdatesCache() {
  setupMockStorage();

  const notice: MobileNoticeItem = {
    id: "notice-1",
    title: "Exam Schedule",
    body: "Final exams start next Monday.",
    targetRole: "all",
    published: true,
    publishedAt: "2026-09-10T00:00:00.000Z",
    authorId: "admin-1",
    authorName: "Principal",
    createdAt: "2026-09-10T00:00:00.000Z",
  };

  const initialNotification: MobileNotificationItem = {
    id: "notif-101",
    kind: "absence",
    title: "Absence Alert",
    body: "Student was marked absent today.",
    read: false,
    createdAt: "2026-09-14T08:00:00.000Z",
  };

  const initialData: CommunicationsPayload = {
    notices: [notice],
    events: [],
    holidays: [],
    notifications: [initialNotification],
  };

  // Seed cache for parent with child-1
  await setCachedCommunications("school-1", "user-parent-1", "parent", initialData, "child-1");

  // Verify initially unread
  const before = await getCachedCommunications("school-1", "user-parent-1", "parent", "child-1");
  assert.ok(before);
  assert.equal(before.notifications[0].read, false);

  // Update notification to read via updateCachedNotificationReadState
  const updateSuccess = await updateCachedNotificationReadState(
    "school-1",
    "user-parent-1",
    "parent",
    "notif-101",
    true,
    "child-1",
  );
  assert.equal(updateSuccess, true, "Cache update must succeed");

  // Verify updated cache state: notification is read, but notice is untouched
  const after = await getCachedCommunications("school-1", "user-parent-1", "parent", "child-1");
  assert.ok(after);
  assert.equal(after.notifications.length, 1);
  assert.equal(after.notifications[0].id, "notif-101");
  assert.equal(after.notifications[0].read, true, "Notification read state must be persisted as true");
  assert.equal(after.notices.length, 1, "Notices must remain preserved in cache");
  assert.equal(after.notices[0].title, "Exam Schedule");

  console.log("✓ Successful mark-read updates cache partition without deleting content tests passed");
}

// 8. Failed mark-read stays unread and captures user-visible error
async function testFailedMarkReadStaysUnread() {
  setupMockStorage();

  const initialNotifications: MobileNotificationItem[] = [
    {
      id: "notif-201",
      title: "Fee Reminder",
      body: "Term 2 fee is due.",
      read: false,
      createdAt: "2026-09-14T08:00:00.000Z",
    },
  ];

  let localState = [...initialNotifications];
  let actionError: string | null = null;

  // Mock API client that fails with network error
  const mockFailingApi = {
    notifications: {
      async markRead(_id: string) {
        throw new Error("Network request failed");
      },
    },
  };

  // Simulate handleMarkRead implementation from CommunicationsHub
  async function simulateHandleMarkRead(id: string) {
    actionError = null;
    try {
      await mockFailingApi.notifications.markRead(id);
      // Only runs on success
      localState = localState.map((n) => (n.id === id ? { ...n, read: true } : n));
      await updateCachedNotificationReadState("school-1", "user-1", "parent", id, true, "child-1");
    } catch (err) {
      // Failure branch: keep notification unread, surface error
      actionError = err instanceof Error ? err.message : "Failed to mark alert as read";
    }
  }

  // Execute markRead which throws
  await simulateHandleMarkRead("notif-201");

  // Assert local state is still unread
  assert.equal(localState[0].read, false, "Notification must stay unread on API failure");

  // Assert error message is populated for user display
  assert.equal(actionError, "Network request failed", "User-visible error must be captured");

  console.log("✓ Failed mark-read keeps notification unread and surfaces error tests passed");
}

// 9. Same user + same school + different active roles => different communications cache keys
function testSameUserDifferentActiveRolesPartitioning() {
  const schoolId = "school-main";
  const userId = "user-multi-role";

  const keyTeacher = buildCommunicationsCacheKey(schoolId, userId, "teacher");
  const keyParent = buildCommunicationsCacheKey(schoolId, userId, "parent", "child-1");
  const keyStudent = buildCommunicationsCacheKey(schoolId, userId, "student");

  assert.ok(keyTeacher);
  assert.ok(keyParent);
  assert.ok(keyStudent);

  assert.notEqual(
    keyTeacher,
    keyParent,
    "Same user with different active roles (teacher vs parent) must produce different cache keys",
  );
  assert.notEqual(
    keyTeacher,
    keyStudent,
    "Same user with different active roles (teacher vs student) must produce different cache keys",
  );
  assert.notEqual(
    keyParent,
    keyStudent,
    "Same user with different active roles (parent vs student) must produce different cache keys",
  );

  console.log("✓ Same user + same school + different active roles producing different cache keys test passed");
}

async function main() {
  testAudiencePresentation();
  testEventPartitioning();
  testHolidayOrdering();
  testCacheKeyPartitioning();
  testChildCachePartitioning();
  testSameUserDifferentActiveRolesPartitioning();
  await testMissingAuthContextFailsClosed();
  await testSuccessfulMarkReadUpdatesCache();
  await testFailedMarkReadStaysUnread();

  console.log("\n========================================================");
  console.log("ALL COM-003 MOBILE COMMUNICATIONS TESTS PASSED (9/9)");
  console.log("========================================================\n");
}

void main();
