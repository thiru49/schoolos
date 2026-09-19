import type { ThemeColors } from "../tokens/colors";

type Typography = {
  families: { display: string; body: string; tamil: string };
  scale: { xs: number; sm: number; md: number; lg: number; xl: number; display: number };
};

/** Canonical CSS custom property names consumed by web Tailwind and mobile NativeWind. */
export function themeToCssVars(colors: ThemeColors, typography: Typography): Record<string, string> {
  return {
    "--color-primary": colors.primary,
    "--color-primary-dark": colors.primaryDark,
    "--color-accent": colors.accent,
    "--color-background": colors.background,
    "--color-success": colors.success,
    "--color-warning": colors.warning,
    "--color-danger": colors.danger,
    "--color-canvas": colors.canvas,
    "--color-surface": colors.surface,
    "--color-surface-muted": colors.surfaceMuted,
    "--color-border": colors.border,
    "--color-border-strong": colors.borderStrong,
    "--color-ink": colors.ink,
    "--color-ink-muted": colors.inkMuted,
    "--color-ink-inverse": colors.inkInverse,
    "--color-link": colors.link,
    "--color-status-present": colors.status.present,
    "--color-status-absent": colors.status.absent,
    "--color-status-late": colors.status.late,
    "--color-status-holiday": colors.status.holiday,
    "--color-status-fee-due": colors.status.feeDue,
    "--color-status-published": colors.status.published,
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
}
