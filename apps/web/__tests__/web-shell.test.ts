import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";
import { filterNavItems, isNavItemActive } from "../components/shell/sidebar-nav";
import {
  getMobileNavToggleLabel,
  getSidebarPanelClasses,
  shouldShowMobileNavBackdrop,
} from "../components/shell/shell-policy";

console.log("Starting WEB-UX-003 Responsive Web Shell Unit Tests...\n");

// ============================================================================
// 1. Permission-filtered navigation is preserved
// ============================================================================

const teacherItems = filterNavItems([
  PERMISSIONS.ATTENDANCE_READ,
  PERMISSIONS.HOMEWORK_READ,
  PERMISSIONS.TIMETABLE_READ,
  PERMISSIONS.EXAMS_READ,
  PERMISSIONS.REPORTS_PROGRESS,
]);

assert.equal(teacherItems.some((item) => item.href === "/dashboard"), true, "Dashboard is always visible");
assert.equal(teacherItems.some((item) => item.href === "/fees"), false, "Teacher without FEES_READ does not see Fees");
assert.equal(teacherItems.some((item) => item.href === "/reports"), true, "Teacher with reports.progress sees Reports");

const accountsItems = filterNavItems([PERMISSIONS.FEES_READ, PERMISSIONS.REPORTS_FEES]);
assert.equal(accountsItems.some((item) => item.href === "/fees"), true, "Accounts staff sees Fees");
assert.equal(accountsItems.some((item) => item.href === "/settings"), false, "Accounts staff without settings permission is gated");

assert.equal(isNavItemActive("/reports", "/reports/attendance"), true, "Child report routes stay active");
assert.equal(isNavItemActive("/dashboard", "/dashboard/extra"), false, "Dashboard does not prefix-match");

console.log("✓ Sidebar permission filtering tests passed");

// ============================================================================
// 2. Responsive shell policy helpers
// ============================================================================

assert.equal(
  getSidebarPanelClasses(false),
  "-translate-x-full md:translate-x-0",
  "Closed mobile nav hides sidebar off-canvas while desktop stays visible",
);
assert.equal(getSidebarPanelClasses(true), "translate-x-0", "Open mobile nav reveals sidebar");
assert.equal(shouldShowMobileNavBackdrop(false), false, "Backdrop hidden when mobile nav is closed");
assert.equal(shouldShowMobileNavBackdrop(true), true, "Backdrop shown when mobile nav is open");
assert.equal(getMobileNavToggleLabel(false), "Open navigation menu");
assert.equal(getMobileNavToggleLabel(true), "Close navigation menu");

console.log("✓ Responsive shell policy tests passed");
console.log("\nAll WEB-UX-003 shell tests passed.");
