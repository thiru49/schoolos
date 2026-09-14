import assert from "node:assert/strict";
import type { AclPayload, BrandingPayload } from "@schoolos/types";
import {
  brandingMatchesSlug,
  isSlugPresent,
  normalizeSlug,
  shouldPromptSchoolSelection,
  tenantSessionMatches,
} from "../features/tenant/tenant-policy";

function sampleBranding(overrides: Partial<BrandingPayload> = {}): BrandingPayload {
  return {
    tenantId: "school-1",
    slug: "arulneri",
    schoolName: "Arul Neri Academy",
    tagline: "Learn with purpose",
    location: "Tamil Nadu",
    logoUrl: null,
    poweredBy: "CREOVY",
    theme: {
      primary: "#1e3a8a",
      primaryDark: "#172554",
      accent: "#fbbf24",
      background: "#f8fafc",
      success: "#16a34a",
      warning: "#f59e0b",
      danger: "#dc2626",
    },
    typography: {
      preset: "classic",
      source: "google",
      families: { display: "Merriweather", body: "Source Sans 3", tamil: "Noto Sans Tamil" },
      googleFamilies: ["Merriweather", "Source Sans 3", "Noto Sans Tamil"],
      files: {
        displayRegular: null,
        displayBold: null,
        bodyRegular: null,
        bodyBold: null,
        tamilRegular: null,
      },
      scale: { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, display: 32 },
      lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.7 },
      weights: { regular: "400", medium: "500", semibold: "600", bold: "700" },
      letterSpacing: { display: 0, body: 0 },
    },
    receiptPrefix: "AN",
    defaultLanguage: "en",
    attendanceMode: "daily",
    ...overrides,
  };
}

function sampleAcl(overrides: Partial<AclPayload> = {}): AclPayload {
  return {
    userId: "user-1",
    schoolId: "school-1",
    roles: ["parent"],
    permissions: [],
    scopes: [],
    ...overrides,
  };
}

async function main() {
  console.log("Starting MOB-TENANT-001 mobile tenant tests...");

  assert.equal(normalizeSlug("  ArulNeri  "), "arulneri");
  assert.equal(isSlugPresent("   "), false);
  assert.equal(isSlugPresent("arulneri"), true);

  assert.equal(shouldPromptSchoolSelection(null), true);
  assert.equal(shouldPromptSchoolSelection(undefined), true);
  assert.equal(shouldPromptSchoolSelection(""), true);
  assert.equal(shouldPromptSchoolSelection("arulneri"), false);

  const branding = sampleBranding();
  assert.equal(brandingMatchesSlug(branding, "arulneri"), true);
  assert.equal(brandingMatchesSlug(branding, " ARULNERI "), true);
  assert.equal(brandingMatchesSlug(branding, "other-school"), false);

  assert.equal(tenantSessionMatches(branding, sampleAcl()), true);
  assert.equal(tenantSessionMatches(branding, sampleAcl({ schoolId: "school-2" })), false);

  console.log("PASS: tenant policy helpers");

  console.log("\n✓ MOB-TENANT-001 mobile tenant tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
