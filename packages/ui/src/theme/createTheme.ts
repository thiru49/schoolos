import type { BrandingPayload } from "@schoolos/types";
import { resolveThemeColors, type ThemeColors } from "../tokens/colors";
import { fallbackTypography } from "../tokens/typography";
import { themeToCssVars } from "./cssVars";

export type ResolvedTheme = {
  colors: ThemeColors;
  typography: {
    families: { display: string; body: string; tamil: string };
    scale: { xs: number; sm: number; md: number; lg: number; xl: number; display: number };
    lineHeight: { tight: number; normal: number; relaxed: number };
    weights: { regular: string; medium: string; semibold: string; bold: string };
  };
  cssVars: Record<string, string>;
};

export function createTheme(branding?: BrandingPayload | null): ResolvedTheme {
  const colors = resolveThemeColors(branding?.theme);

  const typography = branding
    ? {
        families: branding.typography.families,
        scale: branding.typography.scale,
        lineHeight: branding.typography.lineHeight,
        weights: branding.typography.weights,
      }
    : fallbackTypography;

  return { colors, typography, cssVars: themeToCssVars(colors, typography) };
}
