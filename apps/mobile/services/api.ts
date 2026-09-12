import { createApiClient } from "@schoolos/api-client";
import { getAccess } from "./storage";

export async function api() {
  const accessToken = await getAccess();
  return createApiClient({
    baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000",
    getTokens: () => ({ accessToken, refreshToken: null }),
  });
}
