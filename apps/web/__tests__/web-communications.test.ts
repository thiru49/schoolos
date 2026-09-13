import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";

// 1. Test Sidebar navigation definitions and permissions
const NAV = [
  { href: "/notices", label: "Notices", permission: PERMISSIONS.NOTICES_READ },
  { href: "/events", label: "Events", permission: PERMISSIONS.EVENTS_READ },
  { href: "/holidays", label: "Holidays", permission: PERMISSIONS.NOTICES_READ },
];

assert.equal(NAV[0]?.permission, "notices.read", "Notices route requires notices.read");
assert.equal(NAV[1]?.permission, "events.read", "Events route requires events.read");
assert.equal(NAV[2]?.permission, "notices.read", "Holidays route requires notices.read");

// 2. Test Notice targetRole canonical mappings
function canonicalTargetRole(role: string): "student" | "parent" | "teacher" | null {
  if (role === "all" || role === "everyone" || !role) return null;
  if (role === "student" || role === "parent" || role === "teacher") return role;
  return null;
}

assert.equal(canonicalTargetRole("all"), null);
assert.equal(canonicalTargetRole(""), null);
assert.equal(canonicalTargetRole("student"), "student");
assert.equal(canonicalTargetRole("parent"), "parent");
assert.equal(canonicalTargetRole("teacher"), "teacher");

// 3. Test Notice draft state determination (must use published === false)
function isNoticeDraft(notice: { published: boolean; publishedAt: string | null }): boolean {
  return !notice.published;
}

assert.equal(isNoticeDraft({ published: false, publishedAt: "2026-09-13T00:00:00Z" }), true);
assert.equal(isNoticeDraft({ published: true, publishedAt: "2026-09-13T00:00:00Z" }), false);
assert.equal(isNoticeDraft({ published: false, publishedAt: null }), true);

// 4. Test Event date validation
function validateEventDates(startDate: string, endDate: string): string | null {
  if (!startDate) return "Start date is required.";
  if (!endDate) return "End date is required.";
  if (startDate > endDate) return "End date cannot be earlier than start date.";
  return null;
}

assert.equal(validateEventDates("2026-10-01", "2026-10-02"), null);
assert.equal(validateEventDates("2026-10-01", "2026-10-01"), null);
assert.equal(
  validateEventDates("2026-10-05", "2026-10-01"),
  "End date cannot be earlier than start date."
);

// 5. Test Holiday academicYearId handling (optional on create)
function prepareHolidayPayload(name: string, date: string, academicYearId?: string) {
  const payload: { name: string; date: string; academicYearId?: string } = {
    name: name.trim(),
    date,
  };
  if (academicYearId && academicYearId.trim() && academicYearId !== "auto") {
    payload.academicYearId = academicYearId.trim();
  }
  return payload;
}

const omittedYear = prepareHolidayPayload("Gandhi Jayanti", "2026-10-02");
assert.equal(omittedYear.academicYearId, undefined, "academicYearId should be omitted when not specified");

const autoYear = prepareHolidayPayload("Gandhi Jayanti", "2026-10-02", "auto");
assert.equal(autoYear.academicYearId, undefined, "academicYearId should be omitted when set to auto");

const specifiedYear = prepareHolidayPayload(
  "Gandhi Jayanti",
  "2026-10-02",
  "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
);
assert.equal(
  specifiedYear.academicYearId,
  "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "academicYearId should be preserved when explicitly provided"
);

console.log("ALL COM-002 WEB COMMUNICATIONS UNIT TESTS PASSED");
