import type { BrandingTypography } from "@schoolos/types";

const baseScale = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  display: 28,
};

const baseLineHeight = { tight: 1.2, normal: 1.45, relaxed: 1.65 };
const baseWeights = { regular: "400", medium: "500", semibold: "600", bold: "700" };
const emptyFiles = {
  displayRegular: null,
  displayBold: null,
  bodyRegular: null,
  bodyBold: null,
  tamilRegular: null,
};

function googleFamilies(...families: string[]) {
  return families.map((f) => `${f.replace(/ /g, "+")}:wght@400;500;600;700`);
}

export const BRANDING_TYPOGRAPHY_PRESET_IDS = [
  "arulneri",
  "modern",
  "classic",
  "tamil-first",
] as const;

export type BrandingTypographyPresetId = (typeof BRANDING_TYPOGRAPHY_PRESET_IDS)[number];

export const BRANDING_TYPOGRAPHY_PRESETS: Record<BrandingTypographyPresetId, BrandingTypography> = {
  arulneri: {
    preset: "arulneri",
    source: "google",
    families: {
      display: "Plus Jakarta Sans",
      body: "Plus Jakarta Sans",
      tamil: "Noto Sans Tamil",
    },
    googleFamilies: googleFamilies("Plus Jakarta Sans", "Noto Sans Tamil"),
    files: emptyFiles,
    scale: baseScale,
    lineHeight: baseLineHeight,
    weights: baseWeights,
    letterSpacing: { display: 0, body: 0 },
  },
  modern: {
    preset: "modern",
    source: "google",
    families: {
      display: "Inter",
      body: "Inter",
      tamil: "Noto Sans Tamil",
    },
    googleFamilies: googleFamilies("Inter", "Noto Sans Tamil"),
    files: emptyFiles,
    scale: baseScale,
    lineHeight: baseLineHeight,
    weights: baseWeights,
    letterSpacing: { display: 0, body: 0 },
  },
  classic: {
    preset: "classic",
    source: "google",
    families: {
      display: "Poppins",
      body: "Open Sans",
      tamil: "Noto Sans Tamil",
    },
    googleFamilies: googleFamilies("Poppins", "Open Sans", "Noto Sans Tamil"),
    files: emptyFiles,
    scale: baseScale,
    lineHeight: baseLineHeight,
    weights: baseWeights,
    letterSpacing: { display: 0, body: 0 },
  },
  "tamil-first": {
    preset: "tamil-first",
    source: "google",
    families: {
      display: "Hind Madurai",
      body: "Noto Sans",
      tamil: "Noto Sans Tamil",
    },
    googleFamilies: googleFamilies("Hind Madurai", "Noto Sans", "Noto Sans Tamil"),
    files: emptyFiles,
    scale: baseScale,
    lineHeight: baseLineHeight,
    weights: baseWeights,
    letterSpacing: { display: 0, body: 0 },
  },
};

function uniqueGoogleFamilies(families: { display: string; body: string; tamil: string }) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of [families.display, families.body, families.tamil]) {
    if (!seen.has(name)) {
      seen.add(name);
      out.push(`${name.replace(/ /g, "+")}:wght@400;500;600;700`);
    }
  }
  return out;
}

function scaleFromBaseMd(md: number): BrandingTypography["scale"] {
  const ratio = md / baseScale.md;
  return {
    xs: Math.round(baseScale.xs * ratio),
    sm: Math.round(baseScale.sm * ratio),
    md,
    lg: Math.round(baseScale.lg * ratio),
    xl: Math.round(baseScale.xl * ratio),
    display: Math.round(baseScale.display * ratio),
  };
}

export type BrandingTypographyUpdateInput = {
  preset?: BrandingTypographyPresetId;
  families?: Partial<BrandingTypography["families"]>;
  scale?: { md?: number };
};

export function resolveTypographyUpdate(
  current: BrandingTypography,
  input: BrandingTypographyUpdateInput,
): BrandingTypography {
  let next: BrandingTypography =
    input.preset ? { ...BRANDING_TYPOGRAPHY_PRESETS[input.preset] } : { ...current };

  if (input.families) {
    next = {
      ...next,
      families: {
        display: input.families.display ?? next.families.display,
        body: input.families.body ?? next.families.body,
        tamil: input.families.tamil ?? next.families.tamil,
      },
      googleFamilies: uniqueGoogleFamilies({
        display: input.families.display ?? next.families.display,
        body: input.families.body ?? next.families.body,
        tamil: input.families.tamil ?? next.families.tamil,
      }),
    };
  }

  if (input.scale?.md !== undefined) {
    next = { ...next, scale: scaleFromBaseMd(input.scale.md) };
  }

  return next;
}
