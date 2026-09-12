export const fallbackTypography = {
  families: {
    display: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    tamil: "Noto Sans Tamil",
  },
  scale: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    display: 28,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.65,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const FONT_ALLOWLIST = [
  "Plus Jakarta Sans",
  "Inter",
  "Poppins",
  "Nunito",
  "Noto Sans",
  "Noto Sans Tamil",
  "Hind Madurai",
  "Roboto",
  "Open Sans",
] as const;
