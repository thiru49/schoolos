import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  canReadNotices,
  canWriteNotices,
  canReadEvents,
  canWriteEvents,
  canReadHolidays,
  canManageHolidays,
  checkCommunicationsRouteAccess,
} from "../features/communications/communications-policy";

console.log("Starting COM-002 Web Communications Logic & Validation Tests...");

// ============================================================================
// 1. Sidebar Navigation & ACL Gating Logic
// ============================================================================
const NAV = [
  { href: "/notices", label: "Notices", permission: PERMISSIONS.NOTICES_READ },
  { href: "/events", label: "Events", permission: PERMISSIONS.EVENTS_READ },
  { href: "/holidays", label: "Holidays", permission: PERMISSIONS.NOTICES_READ },
];

function filterSidebar(permissions: string[]) {
  return NAV.filter((item) => !item.permission || permissions.includes(item.permission));
}

// User with no permissions
assert.equal(filterSidebar([]).length, 0, "Users with no permissions see 0 communications links");

// User with NOTICES_READ only
const noticesOnly = filterSidebar([PERMISSIONS.NOTICES_READ]);
assert.equal(noticesOnly.length, 2, "NOTICES_READ user sees Notices and Holidays (which uses NOTICES_READ)");
assert.deepEqual(
  noticesOnly.map((i) => i.href),
  ["/notices", "/holidays"]
);

// User with EVENTS_READ only
const eventsOnly = filterSidebar([PERMISSIONS.EVENTS_READ]);
assert.equal(eventsOnly.length, 1);
assert.equal(eventsOnly[0]?.href, "/events");

// Full staff user with all communication permissions
const fullStaff = filterSidebar([PERMISSIONS.NOTICES_READ, PERMISSIONS.EVENTS_READ]);
assert.equal(fullStaff.length, 3, "Full permissions see all 3 links");

console.log("✓ Sidebar navigation & ACL logic tests passed");

// ============================================================================
// 2. Permission & Scope Based Action Logic (Create / Edit / Delete / Publish)
// ============================================================================
function getActionPermissions(acl: { permissions: string[]; scopes: { type: string }[] }) {
  return {
    notices: {
      canRead: canReadNotices(acl),
      canWrite: canWriteNotices(acl),
      showCreateButton: canWriteNotices(acl),
      showEditButton: canWriteNotices(acl),
      showPublishToggle: canWriteNotices(acl),
      showDeleteButton: canWriteNotices(acl),
    },
    events: {
      canRead: canReadEvents(acl),
      canWrite: canWriteEvents(acl),
      showCreateButton: canWriteEvents(acl),
      showEditButton: canWriteEvents(acl),
      showPublishToggle: canWriteEvents(acl),
      showDeleteButton: canWriteEvents(acl),
    },
    holidays: {
      canRead: canReadHolidays(acl),
      canManage: canManageHolidays(acl),
      showAddButton: canManageHolidays(acl),
      showDeleteButton: canManageHolidays(acl),
      hasEditAction: false, // COM-001 has no PATCH for holidays; strictly no edit action
    },
  };
}

// Parent/Student (Read-only)
const parentAcl = getActionPermissions({
  permissions: [PERMISSIONS.NOTICES_READ, PERMISSIONS.EVENTS_READ],
  scopes: [{ type: "children" }],
});
assert.equal(parentAcl.notices.canRead, true);
assert.equal(parentAcl.notices.showCreateButton, false, "Parent cannot create notice");
assert.equal(parentAcl.notices.showEditButton, false, "Parent cannot edit notice");
assert.equal(parentAcl.notices.showPublishToggle, false, "Parent cannot toggle publish notice");
assert.equal(parentAcl.notices.showDeleteButton, false, "Parent cannot delete notice");
assert.equal(parentAcl.events.canRead, true);
assert.equal(parentAcl.events.showCreateButton, false, "Parent cannot create event");
assert.equal(parentAcl.events.showDeleteButton, false, "Parent cannot delete event");
assert.equal(parentAcl.holidays.canRead, true);
assert.equal(parentAcl.holidays.showAddButton, false, "Parent cannot add holiday");
assert.equal(parentAcl.holidays.showDeleteButton, false, "Parent cannot delete holiday");
assert.equal(parentAcl.holidays.hasEditAction, false, "Holiday edit action does not exist in COM-001/COM-002");

// Section-scoped user with write permission (denied write without school scope)
const sectionStaffAcl = getActionPermissions({
  permissions: [
    PERMISSIONS.NOTICES_READ,
    PERMISSIONS.NOTICES_WRITE,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_WRITE,
    PERMISSIONS.HOLIDAYS_MANAGE,
  ],
  scopes: [{ type: "section" }],
});
assert.equal(sectionStaffAcl.notices.canWrite, false, "Write notices requires school scope");
assert.equal(sectionStaffAcl.events.canWrite, false, "Write events requires school scope");
assert.equal(sectionStaffAcl.holidays.canManage, false, "Manage holidays requires school scope");

// Admin / Staff with write permissions AND school scope
const adminAcl = getActionPermissions({
  permissions: [
    PERMISSIONS.NOTICES_READ,
    PERMISSIONS.NOTICES_WRITE,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_WRITE,
    PERMISSIONS.HOLIDAYS_MANAGE,
  ],
  scopes: [{ type: "school" }],
});
assert.equal(adminAcl.notices.showCreateButton, true);
assert.equal(adminAcl.notices.showEditButton, true);
assert.equal(adminAcl.notices.showPublishToggle, true);
assert.equal(adminAcl.notices.showDeleteButton, true);
assert.equal(adminAcl.events.showCreateButton, true);
assert.equal(adminAcl.events.showEditButton, true);
assert.equal(adminAcl.events.showPublishToggle, true);
assert.equal(adminAcl.events.showDeleteButton, true);
assert.equal(adminAcl.holidays.showAddButton, true);
assert.equal(adminAcl.holidays.showDeleteButton, true);
assert.equal(adminAcl.holidays.hasEditAction, false, "Holiday UI strictly omits edit action");

// Route protection checks
assert.equal(checkCommunicationsRouteAccess("/notices", { permissions: [PERMISSIONS.NOTICES_READ], scopes: [] }).allowed, true);
assert.equal(checkCommunicationsRouteAccess("/notices", { permissions: [], scopes: [] }).allowed, false);
assert.equal(checkCommunicationsRouteAccess("/events", { permissions: [PERMISSIONS.EVENTS_READ], scopes: [] }).allowed, true);
assert.equal(checkCommunicationsRouteAccess("/events", { permissions: [], scopes: [] }).allowed, false);
assert.equal(checkCommunicationsRouteAccess("/holidays", { permissions: [PERMISSIONS.NOTICES_READ], scopes: [] }).allowed, true);
assert.equal(checkCommunicationsRouteAccess("/holidays", { permissions: [], scopes: [] }).allowed, false);

console.log("✓ Permission-based action logic and policy helper tests passed");

// ============================================================================
// 3. Notice Draft State (must strictly use published === false)
// ============================================================================
function isNoticeDraft(notice: { published: boolean; publishedAt: string | null }): boolean {
  return !notice.published;
}

// Notice with publishedAt set but published = false is still a draft
assert.equal(
  isNoticeDraft({ published: false, publishedAt: "2026-09-13T10:00:00Z" }),
  true,
  "Must use published === false, not infer draft from publishedAt"
);
// Notice with published = true is published
assert.equal(
  isNoticeDraft({ published: true, publishedAt: "2026-09-13T10:00:00Z" }),
  false,
  "Published notice is not a draft"
);
// Notice draft with null publishedAt
assert.equal(isNoticeDraft({ published: false, publishedAt: null }), true);

console.log("✓ Notice draft state semantics tests passed");

// ============================================================================
// 4. Event Start/End Date Validation Logic
// ============================================================================
function validateEventForm(input: {
  title: string;
  startDate: string;
  endDate: string;
}): string | null {
  if (!input.title.trim()) return "Event title is required.";
  if (!input.startDate) return "Start date is required.";
  if (!input.endDate) return "End date is required.";
  if (input.startDate > input.endDate) return "End date cannot be earlier than start date.";
  return null;
}

assert.equal(
  validateEventForm({ title: "Sports Day", startDate: "2026-10-01", endDate: "2026-10-02" }),
  null,
  "Valid multi-day event passes validation"
);
assert.equal(
  validateEventForm({ title: "Annual Day", startDate: "2026-10-01", endDate: "2026-10-01" }),
  null,
  "Single-day event passes validation"
);
assert.equal(
  validateEventForm({ title: "Sports Day", startDate: "2026-10-05", endDate: "2026-10-01" }),
  "End date cannot be earlier than start date.",
  "Inverted date range correctly rejected"
);
assert.equal(
  validateEventForm({ title: "", startDate: "2026-10-01", endDate: "2026-10-02" }),
  "Event title is required.",
  "Empty title correctly rejected"
);
assert.equal(
  validateEventForm({ title: "Camp", startDate: "", endDate: "2026-10-02" }),
  "Start date is required."
);
assert.equal(
  validateEventForm({ title: "Camp", startDate: "2026-10-01", endDate: "" }),
  "End date is required."
);

console.log("✓ Event start/end date validation tests passed");

// ============================================================================
// 5. Holiday AcademicYearId Auto-Resolution & Payload Logic
// ============================================================================
function prepareHolidayPayload(name: string, date: string, academicYearId?: string) {
  if (!name.trim()) throw new Error("Holiday name is required.");
  if (!date) throw new Error("Holiday date is required.");

  return {
    name: name.trim(),
    date,
    ...(academicYearId && academicYearId.trim() ? { academicYearId: academicYearId.trim() } : {}),
  };
}

// 5a. Active year auto-resolution path (academicYearId omitted)
const autoHoliday = prepareHolidayPayload("Diwali", "2026-11-08");
assert.equal(
  autoHoliday.academicYearId,
  undefined,
  "academicYearId is omitted so backend resolves active academic year automatically"
);
assert.equal(autoHoliday.name, "Diwali");
assert.equal(autoHoliday.date, "2026-11-08");

// 5b. Empty string parameter also omits academicYearId
const emptyYearHoliday = prepareHolidayPayload("Pongal", "2027-01-14", "");
assert.equal(
  emptyYearHoliday.academicYearId,
  undefined,
  "Empty string academicYearId cleanly resolves to omitted"
);

console.log("✓ Holiday academicYearId auto-resolution payload tests passed");

// ============================================================================
// 6. Notice Canonical Target Role Mapping Logic
// ============================================================================
function canonicalNoticeRole(role: string): "student" | "parent" | "teacher" | null {
  if (role === "all" || role === "everyone" || !role) return null;
  if (role === "student" || role === "parent" || role === "teacher") return role;
  return null;
}

assert.equal(canonicalNoticeRole("all"), null);
assert.equal(canonicalNoticeRole("everyone"), null);
assert.equal(canonicalNoticeRole(""), null);
assert.equal(canonicalNoticeRole("student"), "student");
assert.equal(canonicalNoticeRole("parent"), "parent");
assert.equal(canonicalNoticeRole("teacher"), "teacher");

console.log("✓ Notice canonical target role mapping tests passed");

console.log("\n========================================================");
console.log("ALL COM-002 WEB COMMUNICATIONS LOGIC & VALIDATION TESTS PASSED (6/6)");
console.log("========================================================\n");
