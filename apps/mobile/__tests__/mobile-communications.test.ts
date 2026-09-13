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
import type {
  MobileEventItem,
  MobileHolidayItem,
  CachedCommunicationsData,
} from "../features/communications/communications-types";

console.log("Starting COM-003 Mobile Communications Unit & Validation Tests...");

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

// 4. Cache-key partitioning and tenant/account/role isolation tests
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

  // Structural validator mock test
  const validPayload: CachedCommunicationsData = {
    schoolId: "school-arulneri",
    userId: "user-1",
    role: "parent",
    notices: [],
    events: [],
    holidays: [],
    notifications: [],
    cachedAt: new Date().toISOString(),
  };

  function validateCacheData(
    data: any,
    expectedSchoolId: string,
    expectedUserId: string,
    expectedRole: string,
  ): boolean {
    if (
      !data ||
      typeof data !== "object" ||
      data.schoolId !== expectedSchoolId ||
      data.userId !== expectedUserId ||
      data.role !== expectedRole ||
      !Array.isArray(data.notices) ||
      !Array.isArray(data.events) ||
      !Array.isArray(data.holidays) ||
      !Array.isArray(data.notifications)
    ) {
      return false;
    }
    return true;
  }

  assert.equal(
    validateCacheData(validPayload, "school-arulneri", "user-1", "parent"),
    true,
    "Valid matching session data passes validation",
  );
  assert.equal(
    validateCacheData(validPayload, "school-b", "user-1", "parent"),
    false,
    "Cross-tenant cache data is strictly rejected",
  );
  assert.equal(
    validateCacheData(validPayload, "school-arulneri", "user-2", "parent"),
    false,
    "Cross-user cache data is strictly rejected",
  );
  assert.equal(
    validateCacheData(validPayload, "school-arulneri", "user-1", "student"),
    false,
    "Cross-role cache data is strictly rejected",
  );

  console.log("✓ Cache-key partitioning and multi-tenant separation tests passed");
}

function main() {
  testAudiencePresentation();
  testEventPartitioning();
  testHolidayOrdering();
  testCacheKeyPartitioning();

  console.log("\n========================================================");
  console.log("ALL COM-003 MOBILE COMMUNICATIONS TESTS PASSED (4/4)");
  console.log("========================================================\n");
}

main();
