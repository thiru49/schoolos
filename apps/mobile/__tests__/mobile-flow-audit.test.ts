import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";
import { filterVisibleShortcuts } from "../features/home/home-policy";
import { getAcademicModulesForRole, teacherMustNotSee } from "../features/home/role-modules";

const FLOWS = {
  teacher: ["/attendance", "/timetable", "/homework", "/marks", "/notices"],
  parent: ["/attendance", "/homework", "/fees", "/marks", "/report-card", "/notices"],
  student: ["/timetable", "/homework", "/marks", "/report-card", "/attendance", "/notices"],
} as const;

async function main() {
  for (const blocked of teacherMustNotSee()) {
    assert.ok(!getAcademicModulesForRole("teacher").includes(blocked));
  }
  assert.ok(!getAcademicModulesForRole("student").includes("fees"));
  assert.ok(getAcademicModulesForRole("parent").includes("fees"));

  const parentRoutes = filterVisibleShortcuts("parent", [
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.FEES_READ,
    PERMISSIONS.MARKS_READ,
    PERMISSIONS.NOTICES_READ,
  ]).map((s) => s.route);
  for (const route of FLOWS.parent) {
    assert.ok(parentRoutes.includes(route), `parent missing ${route}`);
  }

  const studentRoutes = filterVisibleShortcuts("student", [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.MARKS_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.NOTICES_READ,
  ]).map((s) => s.route);
  for (const route of FLOWS.student) {
    assert.ok(studentRoutes.includes(route), `student missing ${route}`);
  }
  assert.ok(!studentRoutes.includes("/fees"));

  const teacherRoutes = filterVisibleShortcuts("teacher", [
    PERMISSIONS.TIMETABLE_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.HOMEWORK_READ,
    PERMISSIONS.EXAMS_READ,
    PERMISSIONS.NOTICES_READ,
  ]).map((s) => s.route);
  for (const route of FLOWS.teacher) {
    assert.ok(teacherRoutes.includes(route), `teacher missing ${route}`);
  }
  assert.ok(!teacherRoutes.includes("/fees"));
  assert.ok(!teacherRoutes.includes("/report-card"));

  console.log("PASS: mobile flow audit contracts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
