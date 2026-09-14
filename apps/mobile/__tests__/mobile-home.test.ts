import assert from "node:assert/strict";
import { PERMISSIONS, ROLE_CODES, type PermissionCode } from "@schoolos/permissions";
import {
  filterVisibleShortcuts,
  getHomeShortcuts,
  getMobileHomeTitle,
  isShortcutVisible,
  needsActiveRoleSelection,
  resolveMobileHomeRole,
} from "../features/home/home-policy";
import {
  filterTodayPeriods,
  formatAttendanceStatus,
  formatFeeDues,
  getTodayWeekday,
  summarizeTodayClasses,
  todayIsoDate,
  type TimetablePeriod,
} from "../features/home/home-snapshot";

function teacherPermissions(): PermissionCode[] {
  return [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_MARK,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.HOMEWORK_CREATE,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.NOTICES_READ,
  ];
}

function parentPermissions(): PermissionCode[] {
  return [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.MARKS_READ,
    PERMISSIONS.FEES_READ,
    PERMISSIONS.RECEIPTS_READ,
    PERMISSIONS.NOTICES_READ,
  ];
}

function studentPermissions(): PermissionCode[] {
  return [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.HOMEWORK_COMPLETE,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.MARKS_READ,
    PERMISSIONS.NOTICES_READ,
  ];
}

async function main() {
  console.log("Starting MOB-HOME-001 mobile home tests...");

  assert.equal(resolveMobileHomeRole("teacher", ["teacher", "parent"]), "teacher");
  assert.equal(resolveMobileHomeRole("parent", ["teacher", "parent"]), "parent");
  assert.equal(resolveMobileHomeRole(null, ["teacher"]), "teacher");
  assert.equal(resolveMobileHomeRole(null, ["teacher", "parent"]), null);
  assert.equal(needsActiveRoleSelection(null, ["teacher", "parent"]), true);
  assert.equal(needsActiveRoleSelection("teacher", ["teacher", "parent"]), false);
  assert.equal(needsActiveRoleSelection(null, ["teacher"]), false);

  const teacherShortcuts = filterVisibleShortcuts("teacher", teacherPermissions());
  assert.deepEqual(
    teacherShortcuts.map((item) => item.id),
    ["today-classes", "attendance", "homework", "timetable", "exams", "notices"],
  );

  const studentShortcuts = filterVisibleShortcuts("student", studentPermissions());
  assert.deepEqual(
    studentShortcuts.map((item) => item.id),
    ["timetable", "homework", "exams", "attendance", "notices"],
  );

  const parentShortcuts = filterVisibleShortcuts("parent", parentPermissions());
  assert.deepEqual(
    parentShortcuts.map((item) => item.id),
    ["attendance", "homework", "fees", "exams", "notices"],
  );

  const teacherWithoutNotices = filterVisibleShortcuts(
    "teacher",
    teacherPermissions().filter((permission) => permission !== PERMISSIONS.NOTICES_READ),
  );
  assert.equal(
    teacherWithoutNotices.some((item) => item.id === "notices"),
    false,
    "Notices shortcut is hidden without notices.read",
  );

  assert.equal(getMobileHomeTitle("teacher"), "Your day");
  assert.equal(getMobileHomeTitle("student"), "Today");
  assert.equal(getMobileHomeTitle("parent"), "Today");

  assert.equal(isShortcutVisible(getHomeShortcuts("parent")[2], parentPermissions()), true);
  assert.equal(
    isShortcutVisible(getHomeShortcuts("parent")[2], parentPermissions().filter((p) => p !== PERMISSIONS.FEES_READ)),
    false,
  );

  assert.equal(getTodayWeekday(new Date("2026-09-14T10:00:00.000Z")), 1);

  const periods: TimetablePeriod[] = [
    {
      weekday: 1,
      startTime: "09:00",
      endTime: "09:45",
      subjectName: "Math",
      label: "8A · Math",
      published: true,
    },
    {
      weekday: 1,
      startTime: "10:00",
      endTime: "10:45",
      subjectName: "English",
      label: "8A · English",
      published: true,
    },
    {
      weekday: 2,
      startTime: "09:00",
      endTime: "09:45",
      subjectName: "Science",
      label: "8A · Science",
      published: true,
    },
  ];

  assert.equal(filterTodayPeriods(periods, 1).length, 2);
  assert.match(
    summarizeTodayClasses(periods, new Date("2026-09-14T09:30:00.000Z")),
    /^Now: Math$/,
  );
  assert.match(
    summarizeTodayClasses(periods, new Date("2026-09-14T09:50:00.000Z")),
    /^Next: English at 10:00$/,
  );
  assert.equal(formatAttendanceStatus("P"), "Present");
  assert.equal(formatAttendanceStatus(null), "Not marked yet");
  assert.equal(formatFeeDues(0), "No dues");
  assert.equal(formatFeeDues(1200), "Dues ₹1200");
  assert.match(todayIsoDate(new Date("2026-09-14T12:00:00.000Z")), /^2026-09-14$/);

  assert.equal(resolveMobileHomeRole(ROLE_CODES.TEACHER, [ROLE_CODES.TEACHER, ROLE_CODES.PARENT]), "teacher");
  assert.equal(resolveMobileHomeRole(ROLE_CODES.PARENT, [ROLE_CODES.TEACHER, ROLE_CODES.PARENT]), "parent");
  assert.equal(resolveMobileHomeRole(ROLE_CODES.STUDENT, [ROLE_CODES.STUDENT]), "student");

  console.log("PASS: mobile home policy and snapshot helpers");
  console.log("\n✓ MOB-HOME-001 mobile home tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
