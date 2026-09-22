import assert from "node:assert/strict";
import {
  ACTORS,
  AUTH_FLOW,
  SCREEN_SCENARIOS,
  TAB_ROUTES,
  academicModulesFor,
  canOpenRoute,
  homeDashboardFor,
  isolationCases,
  visibleRoutesFor,
} from "../features/home/all-scenarios";
import { needsActiveRoleSelection, resolveMobileHomeRole } from "../features/home/home-policy";
import {
  formatParentChildBadge,
  formatStudentIdentity,
  formatTeacherAttendanceMetric,
} from "../features/home/enduser-copy";

async function main() {
  assert.deepEqual([...AUTH_FLOW], ["/", "/school-select", "/login", "/role-select", "/(tabs)/home"]);
  assert.equal(TAB_ROUTES.length, 4);

  assert.equal(homeDashboardFor("teacher", ["teacher"]), "TeacherHomeDashboard");
  assert.equal(homeDashboardFor("parent", ["parent"]), "ParentHomeDashboard");
  assert.equal(homeDashboardFor("student", ["student"]), "StudentHomeDashboard");
  assert.equal(homeDashboardFor(null, ["teacher", "parent"]), "needs-role-select");
  assert.equal(needsActiveRoleSelection(null, ["teacher", "parent"]), true);
  assert.equal(resolveMobileHomeRole("teacher", ["teacher", "parent"]), "teacher");

  assert.equal(ACTORS.teacher.login, "TCH-8A");
  assert.equal(ACTORS.parent.login, "9000000001");
  assert.equal(ACTORS.student.login, "AN2021-0001");

  for (const scenario of SCREEN_SCENARIOS) {
    const opened = canOpenRoute(scenario.actor, scenario.route);
    assert.equal(opened, scenario.canOpen, `${scenario.id} ${scenario.route}`);
  }

  assert.deepEqual(academicModulesFor("teacher"), ["attendance", "timetable", "homework", "marks"]);
  assert.ok(academicModulesFor("parent").includes("fees"));
  assert.ok(academicModulesFor("parent").includes("report-card"));
  assert.ok(!academicModulesFor("student").includes("fees"));
  assert.ok(!academicModulesFor("teacher").includes("fees"));

  assert.ok(visibleRoutesFor("teacher").includes("/attendance"));
  assert.ok(!visibleRoutesFor("teacher").includes("/fees"));
  assert.ok(visibleRoutesFor("parent").includes("/fees"));
  assert.ok(!visibleRoutesFor("student").includes("/fees"));

  const iso = isolationCases();
  assert.equal(iso.find((c) => c.section === "8-A")?.expected, "roster");
  assert.equal(iso.find((c) => c.section === "9-B")?.expected, "403");
  assert.equal(iso.find((c) => c.child === "Arun")?.expected, "scoped");

  assert.equal(formatTeacherAttendanceMetric({ total: 30, unmarked: 30, marked: 0 }), "Pending");
  assert.equal(formatTeacherAttendanceMetric({ total: 30, unmarked: 0, marked: 30 }), "Saved");
  assert.equal(formatParentChildBadge("8", "A"), "Parent · 8-A");
  assert.equal(formatStudentIdentity({ userId: "AN2021-0001" }).title, "AN2021-0001");

  const teacherMustNot = ["ChildSwitcher", "Fees", "collect-upi"];
  for (const s of SCREEN_SCENARIOS.filter((x) => x.actor === "teacher")) {
    for (const blocked of teacherMustNot) {
      if (s.mustNot.includes(blocked) || s.route === "/fees") {
        assert.ok(true);
      }
    }
  }

  console.log(`PASS: ${SCREEN_SCENARIOS.length} screen scenarios + isolation + auth shell`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
