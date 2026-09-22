import assert from "node:assert/strict";
import {
  formatParentChildBadge,
  formatStudentIdentity,
  formatTeacherAttendanceMetric,
} from "../features/home/enduser-copy";

async function main() {
  assert.equal(formatTeacherAttendanceMetric({ total: 0, unmarked: 0, marked: 0 }), "No roster");
  assert.equal(formatTeacherAttendanceMetric({ total: 30, unmarked: 30, marked: 0 }), "Pending");
  assert.equal(formatTeacherAttendanceMetric({ total: 30, unmarked: 4, marked: 26 }), "4 left");
  assert.equal(formatTeacherAttendanceMetric({ total: 30, unmarked: 0, marked: 30 }), "Saved");

  assert.deepEqual(formatStudentIdentity({ userId: "AN2021-0001" }), {
    title: "AN2021-0001",
    badge: "Student · own record only",
  });
  assert.deepEqual(
    formatStudentIdentity({ fullName: "Arun Kumar", className: "8", sectionName: "A" }),
    { title: "Arun Kumar", badge: "Student · 8-A" },
  );

  assert.equal(formatParentChildBadge("8", "A"), "Parent · 8-A");
  assert.equal(formatParentChildBadge(), "Parent · select child");

  console.log("PASS: end-user polish copy");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
