import { createApiClient } from "@schoolos/api-client";
import { clearSession, getAccessToken, getRefreshToken, getSlug, setTokens } from "./session";

export function api() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return createApiClient({
    baseUrl,
    getTokens: () => ({
      accessToken: getAccessToken(),
      refreshToken: getRefreshToken(),
    }),
    getSlug: () => getSlug(),
    setTokens: ({ accessToken, refreshToken }) => {
      if (accessToken && refreshToken) setTokens(accessToken, refreshToken);
    },
    onAuthFailure: () => clearSession(),
  });
}
