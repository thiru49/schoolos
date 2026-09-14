import assert from "node:assert/strict";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  canReadSettings,
  canUpdateBranding,
  canUpdateSettings,
  hasSchoolScope,
} from "../features/settings/settings-policy";

console.log("Starting SET-001 Web Settings Logic Tests...");

const superAdminAcl = {
  permissions: [
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.SCHOOL_SETTINGS_UPDATE,
    PERMISSIONS.SCHOOL_BRANDING_UPDATE,
  ],
  scopes: [{ type: "school" }],
};

const schoolAdminAcl = {
  permissions: [PERMISSIONS.SCHOOL_SETTINGS_READ],
  scopes: [{ type: "school" }],
};

const teacherAcl = {
  permissions: [PERMISSIONS.ATTENDANCE_READ],
  scopes: [{ type: "section" }],
};

assert.equal(canReadSettings(superAdminAcl), true);
assert.equal(canUpdateSettings(superAdminAcl), true);
assert.equal(canUpdateBranding(superAdminAcl), true);

assert.equal(canReadSettings(schoolAdminAcl), true);
assert.equal(canUpdateSettings(schoolAdminAcl), false);
assert.equal(canUpdateBranding(schoolAdminAcl), false);

assert.equal(canReadSettings(teacherAcl), false);
assert.equal(hasSchoolScope(teacherAcl), false);

const NAV = [
  { href: "/settings", permission: PERMISSIONS.SCHOOL_SETTINGS_READ },
];

function filterSidebar(permissions: string[]) {
  return NAV.filter((item) => permissions.includes(item.permission));
}

assert.equal(filterSidebar([PERMISSIONS.SCHOOL_SETTINGS_READ]).length, 1);
assert.equal(filterSidebar([]).length, 0);

console.log("✓ SET-001 web settings policy tests passed");
