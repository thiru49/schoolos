import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  canReadSettings,
  canUpdateBranding,
  canUpdateSettings,
  hasSchoolScope,
} from "../features/settings/settings-policy";

console.log("Starting SET-001 / WEB-UX-006 Web Settings Logic Tests...");

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

// ============================================================================
// WEB-UX-006: Settings/branding submit-safety contract (in-flight protection)
// ============================================================================
const settingsBoardSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../features/settings/settings-board.tsx"),
  "utf8",
);

const submitSafetyPatterns: { pattern: RegExp; label: string }[] = [
  { pattern: /const \[savingBranding, setSavingBranding\] = useState\(false\)/, label: "branding saving flag" },
  { pattern: /const \[savingOps, setSavingOps\] = useState\(false\)/, label: "operational saving flag" },
  { pattern: /const \[uploadingLogo, setUploadingLogo\] = useState\(false\)/, label: "logo upload flag" },
  { pattern: /if \(!settings \|\| !canBrand \|\| savingBranding\) return/, label: "branding early return" },
  { pattern: /if \(!settings \|\| !canOps \|\| savingOps\) return/, label: "operational early return" },
  {
    pattern: /if \(!file \|\| !settings \|\| !canBrand \|\| uploadingLogo\) return/,
    label: "logo upload early return",
  },
  { pattern: /disabled=\{savingBranding\}/, label: "branding submit disabled" },
  { pattern: /disabled=\{savingOps\}/, label: "operational submit disabled" },
  { pattern: /disabled=\{readOnlyBranding \|\| savingBranding\}/, label: "branding fields disabled while saving" },
  { pattern: /disabled=\{readOnlyOps \|\| savingOps\}/, label: "operational fields disabled while saving" },
  { pattern: /Saving branding…/, label: "branding saving label" },
  { pattern: /Saving…/, label: "operational saving label" },
  { pattern: /Uploading…/, label: "logo uploading label" },
  { pattern: /api\(\)\.branding\.update\(/, label: "tenant-scoped branding update API" },
  { pattern: /api\(\)\.branding\.updateSettings\(/, label: "tenant-scoped settings update API" },
  { pattern: /api\(\)\.branding\.uploadLogo\(/, label: "tenant-scoped logo upload API" },
];

for (const { pattern, label } of submitSafetyPatterns) {
  assert.match(settingsBoardSource, pattern, `Missing submit-safety: ${label}`);
}

console.log("✓ WEB-UX-006 settings submit-safety contract tests passed");
