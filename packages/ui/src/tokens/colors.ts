import type { BrandingTheme } from "@schoolos/types";
import { STATUS_CHIPS, STATUS_CHIP_SEMANTIC, type StatusChip, type StatusChipSemantic } from "../contracts/Status";

/**
 * Tenant-overridable brand colours. Matches `BrandingTheme` plus canvas/ink
 * fallbacks used before branding loads. Do not introduce a second palette.
 */
export const fallbackColors = {
  primary: "#0B3A6E",
  primaryDark: "#082A50",
  accent: "#E8A317",
  background: "#F4F7FB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  canvas: "#F4F7FB",
  ink: "#0F172A",
} as const;

/** Surfaces that sit on canvas/ink — neutrals, not a competing brand. */
export const fallbackSurfaces = {
  surface: "#FFFFFF",
  surfaceMuted: "#E8EEF5",
  border: "#D6DEE8",
  borderStrong: "#94A3B8",
} as const;

/** Text roles. `link` is resolved to primary at theme time. */
export const fallbackText = {
  ink: fallbackColors.ink,
  inkMuted: "#475569",
  inkInverse: "#FFFFFF",
} as const;

export type BrandColors = {
  primary: string;
  primaryDark: string;
  accent: string;
  background: string;
  success: string;
  warning: string;
  danger: string;
};

export type SurfaceColors = {
  canvas: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
};

export type TextColors = {
  ink: string;
  inkMuted: string;
  inkInverse: string;
  link: string;
};

export type StatusColors = Record<StatusChip, string>;

export type ThemeColors = BrandColors &
  SurfaceColors &
  TextColors & {
    status: StatusColors;
  };

const SEMANTIC_TO_BRAND: Record<StatusChipSemantic, keyof (BrandColors & SurfaceColors & TextColors)> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  primary: "primary",
  inkMuted: "inkMuted",
};

function resolveStatusColors(resolved: BrandColors & SurfaceColors & TextColors): StatusColors {
  const out = {} as StatusColors;
  for (const chip of STATUS_CHIPS) {
    const role = STATUS_CHIP_SEMANTIC[chip];
    const key = SEMANTIC_TO_BRAND[role];
    out[chip] = resolved[key];
  }
  return out;
}

/** Merge branding API colours over fallbacks, then derive semantic layers. */
export function resolveThemeColors(theme?: BrandingTheme | null): ThemeColors {
  const brand: BrandColors = theme
    ? {
        primary: theme.primary,
        primaryDark: theme.primaryDark,
        accent: theme.accent,
        background: theme.background,
        success: theme.success,
        warning: theme.warning,
        danger: theme.danger,
      }
    : {
        primary: fallbackColors.primary,
        primaryDark: fallbackColors.primaryDark,
        accent: fallbackColors.accent,
        background: fallbackColors.background,
        success: fallbackColors.success,
        warning: fallbackColors.warning,
        danger: fallbackColors.danger,
      };

  const surfaces: SurfaceColors = {
    canvas: brand.background,
    ...fallbackSurfaces,
  };

  const text: TextColors = {
    ink: fallbackText.ink,
    inkMuted: fallbackText.inkMuted,
    inkInverse: fallbackText.inkInverse,
    link: brand.primary,
  };

  const resolved = { ...brand, ...surfaces, ...text };
  return {
    ...resolved,
    status: resolveStatusColors(resolved),
  };
}
