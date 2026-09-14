import * as Font from "expo-font";
import type { BrandingPayload } from "@schoolos/types";
import { api } from "../../services/api";

const TAMIL_FONT =
  "https://fonts.gstatic.com/s/notosanstamil/v27/ieVc2YdFI3GCY6SyQy1KfStzYKZgzN1z4VKFvNBh8ZKb1nc.ttf";

export async function loadTamilFont(): Promise<void> {
  try {
    await Font.loadAsync({ "Noto Sans Tamil": { uri: TAMIL_FONT } });
  } catch {
    // Fallback is handled by AppText if the remote font cannot load.
  }
}

export async function fetchTenantBranding(slug: string): Promise<BrandingPayload> {
  const client = await api();
  return client.branding.get(slug);
}

export async function loadTenantBranding(slug: string): Promise<BrandingPayload> {
  const branding = await fetchTenantBranding(slug);
  await loadTamilFont();
  return branding;
}
