import type { BrandingTheme, BrandingTypography } from "@schoolos/types";

export const arulNeriTheme: BrandingTheme = {
  primary: "#0B3A6E",
  primaryDark: "#082A50",
  accent: "#E8A317",
  background: "#F4F7FB",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
};

export const arulNeriTypography: BrandingTypography = {
  preset: "arulneri",
  source: "google",
  families: {
    display: "Plus Jakarta Sans",
    body: "Plus Jakarta Sans",
    tamil: "Noto Sans Tamil",
  },
  googleFamilies: [
    "Plus+Jakarta+Sans:wght@400;500;600;700",
    "Noto+Sans+Tamil:wght@400;500;600;700",
  ],
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
};

/** Isolation-test fixture only. Not a product tenant story. */
export const schoolBTheme: BrandingTheme = {
  ...arulNeriTheme,
  primary: "#14532D",
  primaryDark: "#052E16",
  accent: "#CA8A04",
};
