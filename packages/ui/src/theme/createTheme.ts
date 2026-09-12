import type { BrandingPayload } from "@schoolos/types";
import { fallbackColors } from "../tokens/colors";
import { fallbackTypography } from "../tokens/typography";

export type ResolvedTheme = {
  colors: typeof fallbackColors;
  typography: typeof fallbackTypography;
  cssVars: Record<string, string>;
};

export function createTheme(branding?: BrandingPayload | null): ResolvedTheme {
  const colors = branding
    ? {
        ...fallbackColors,
        primary: branding.theme.primary,
        primaryDark: branding.theme.primaryDark,
        accent: branding.theme.accent,
        background: branding.theme.background,
        success: branding.theme.success,
        warning: branding.theme.warning,
        danger: branding.theme.danger,
        canvas: branding.theme.background,
      }
    : fallbackColors;

  const typography = branding
    ? {
        families: branding.typography.families,
        scale: branding.typography.scale,
        lineHeight: branding.typography.lineHeight,
        weights: branding.typography.weights,
      }
    : fallbackTypography;

  const cssVars: Record<string, string> = {
    "--color-primary": colors.primary,
    "--color-primary-dark": colors.primaryDark,
    "--color-accent": colors.accent,
    "--color-background": colors.background,
    "--color-success": colors.success,
    "--color-warning": colors.warning,
    "--color-danger": colors.danger,
    "--color-ink": colors.ink,
    "--font-display": `"${typography.families.display}", ui-sans-serif, sans-serif`,
    "--font-body": `"${typography.families.body}", ui-sans-serif, sans-serif`,
    "--font-tamil": `"${typography.families.tamil}", sans-serif`,
    "--text-xs": `${typography.scale.xs}px`,
    "--text-sm": `${typography.scale.sm}px`,
    "--text-md": `${typography.scale.md}px`,
    "--text-lg": `${typography.scale.lg}px`,
    "--text-xl": `${typography.scale.xl}px`,
    "--text-display": `${typography.scale.display}px`,
  };

  return { colors, typography, cssVars };
}
