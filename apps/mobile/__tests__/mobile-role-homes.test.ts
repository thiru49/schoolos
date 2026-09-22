import assert from "node:assert/strict";
import { PERMISSIONS, type PermissionCode } from "@schoolos/permissions";
import { filterVisibleShortcuts, getMobileHomeTitle } from "../features/home/home-policy";
import { getAcademicModulesForRole, teacherMustNotSee } from "../features/home/role-modules";

function parentPermissions(): PermissionCode[] {
  return [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.MARKS_READ,
    PERMISSIONS.FEES_READ,
    PERMISSIONS.NOTICES_READ,
  ];
}

function studentPermissions(): PermissionCode[] {
  return [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.MARKS_READ,
    PERMISSIONS.NOTICES_READ,
  ];
}

async function main() {
  const parentMods = getAcademicModulesForRole("parent");
  assert.ok(parentMods.includes("fees"));
  assert.ok(parentMods.includes("report-card"));
  assert.ok(parentMods.includes("attendance"));

  const studentMods = getAcademicModulesForRole("student");
  assert.ok(studentMods.includes("report-card"));
  assert.ok(!studentMods.includes("fees"), "Student must not collect or manage fees");

  const teacherMods = getAcademicModulesForRole("teacher");
  for (const blocked of teacherMustNotSee()) {
    assert.ok(!teacherMods.includes(blocked), `Teacher must not see ${blocked}`);
  }

  const parentShortcuts = filterVisibleShortcuts("parent", parentPermissions()).map((s) => s.id);
  assert.ok(parentShortcuts.includes("fees"));
  assert.ok(parentShortcuts.includes("report-card"));
  assert.ok(!parentShortcuts.includes("today-classes"));

  const studentShortcuts = filterVisibleShortcuts("student", studentPermissions()).map((s) => s.id);
  assert.ok(studentShortcuts.includes("report-card"));
  assert.ok(!studentShortcuts.includes("fees"));

  assert.equal(getMobileHomeTitle("parent"), "Your child today");
  assert.equal(getMobileHomeTitle("student"), "My day");

  console.log("PASS: parent/student home role isolation");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
