import assert from "node:assert/strict";
import type { BrandingPayload } from "@schoolos/types";
import { createTheme } from "./createTheme";
import { fallbackColors, fallbackSurfaces, fallbackText } from "../tokens/colors";
import { STATUS_CHIPS, STATUS_CHIP_SEMANTIC } from "../contracts/Status";

function sampleBranding(theme: Partial<BrandingPayload["theme"]> = {}): BrandingPayload {
  return {
    tenantId: "school-1",
    slug: "arulneri",
    schoolName: "Arul Neri Academy",
    tagline: "Learning · Care · Excellence",
    location: "Tamil Nadu",
    logoUrl: null,
    poweredBy: "CREOVY",
    theme: {
      primary: "#0B3A6E",
      primaryDark: "#082A50",
      accent: "#E8A317",
      background: "#F4F7FB",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#DC2626",
      ...theme,
    },
    typography: {
      preset: "arulneri",
      source: "google",
      families: { display: "Plus Jakarta Sans", body: "Plus Jakarta Sans", tamil: "Noto Sans Tamil" },
      googleFamilies: [],
      files: {
        displayRegular: null,
        displayBold: null,
        bodyRegular: null,
        bodyBold: null,
        tamilRegular: null,
      },
      scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, display: 28 },
      lineHeight: { tight: 1.2, normal: 1.45, relaxed: 1.65 },
      weights: { regular: "400", medium: "500", semibold: "600", bold: "700" },
      letterSpacing: { display: 0, body: 0 },
    },
    receiptPrefix: "AN",
    defaultLanguage: "en",
    attendanceMode: "daily",
  };
}

const fallback = createTheme();

assert.equal(fallback.colors.primary, fallbackColors.primary);
assert.equal(fallback.colors.canvas, fallbackColors.canvas);
assert.equal(fallback.colors.surface, fallbackSurfaces.surface);
assert.equal(fallback.colors.inkMuted, fallbackText.inkMuted);
assert.equal(fallback.colors.link, fallbackColors.primary);
assert.equal(fallback.cssVars["--color-canvas"], fallback.colors.canvas);
assert.equal(fallback.cssVars["--color-surface-muted"], fallbackSurfaces.surfaceMuted);
assert.equal(fallback.cssVars["--color-status-fee-due"], fallback.colors.status.feeDue);

for (const chip of STATUS_CHIPS) {
  const role = STATUS_CHIP_SEMANTIC[chip];
  const expected =
    role === "inkMuted" ? fallback.colors.inkMuted : fallback.colors[role];
  assert.equal(fallback.colors.status[chip], expected);
}

const branded = createTheme(
  sampleBranding({
    primary: "#111111",
    background: "#EEEEEE",
    success: "#00AA00",
    danger: "#AA0000",
    warning: "#CC8800",
  }),
);

assert.equal(branded.colors.primary, "#111111");
assert.equal(branded.colors.canvas, "#EEEEEE");
assert.equal(branded.colors.background, "#EEEEEE");
assert.equal(branded.colors.ink, fallbackColors.ink);
assert.equal(branded.colors.link, "#111111");
assert.equal(branded.colors.status.present, "#00AA00");
assert.equal(branded.colors.status.absent, "#AA0000");
assert.equal(branded.colors.status.late, "#CC8800");
assert.equal(branded.colors.status.feeDue, "#CC8800");
assert.equal(branded.colors.status.published, "#111111");
assert.equal(branded.cssVars["--color-primary"], "#111111");
assert.equal(branded.cssVars["--color-link"], "#111111");
assert.equal(branded.cssVars["--color-status-present"], "#00AA00");
assert.equal(branded.typography.families.tamil, "Noto Sans Tamil");

console.log("packages/ui createTheme tests passed");
