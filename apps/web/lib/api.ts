import { createApiClient } from "@schoolos/api-client";
import { getAccessToken } from "./session";

export function api() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return createApiClient({
    baseUrl,
    getTokens: () => ({ accessToken: getAccessToken(), refreshToken: null }),
  });
}
