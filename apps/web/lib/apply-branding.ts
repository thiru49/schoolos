import type { BrandingPayload } from "@schoolos/types";
import { createTheme } from "@schoolos/ui";

const FONT_LINK_ID = "schoolos-branding-fonts";

export function applyBrandingToDocument(branding: BrandingPayload | null | undefined) {
  const theme = createTheme(branding);
  for (const [key, value] of Object.entries(theme.cssVars)) {
    document.documentElement.style.setProperty(key, value);
  }

  const typography = branding?.typography;
  if (!typography || typography.source !== "google" || !typography.googleFamilies?.length) {
    return;
  }

  const href = `https://fonts.googleapis.com/css2?family=${typography.googleFamilies.join("&family=")}&display=swap`;
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) {
    link.href = href;
  }
}
