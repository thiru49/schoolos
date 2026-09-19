import Constants from "expo-constants";
import { createApiClient } from "@schoolos/api-client";
import { clearTokens, getAccess, getRefresh, getSlug, setTokens } from "./storage";

let client: ReturnType<typeof createApiClient> | null = null;

export function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host) {
      return `http://${host}:4000`;
    }
  }
  return "http://localhost:4000";
}

function mobileClient() {
  if (!client) {
    client = createApiClient({
      baseUrl: resolveBaseUrl(),
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
