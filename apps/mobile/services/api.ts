import { createApiClient } from "@schoolos/api-client";
import { clearTokens, getAccess, getRefresh, getSlug, setTokens } from "./storage";

let client: ReturnType<typeof createApiClient> | null = null;

function mobileClient() {
  if (!client) {
    client = createApiClient({
      baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
      getTokens: async () => ({
        accessToken: await getAccess(),
        refreshToken: await getRefresh(),
      }),
      getSlug: async () => await getSlug(),
      setTokens: async ({ accessToken, refreshToken }) => {
        if (accessToken && refreshToken) await setTokens(accessToken, refreshToken);
      },
      onAuthFailure: async () => {
        await clearTokens();
      },
    });
  }
  return client;
}

export async function api() {
  return mobileClient();
}
