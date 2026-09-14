import assert from "node:assert/strict";
import { createApiClient, ApiError } from "@schoolos/api-client";

async function main() {
  console.log("Starting mobile API client refresh tests...");

  let access: string | null = "access-1";
  let refresh: string | null = "refresh-1";
  let authFailed = false;
  let call = 0;

  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    if (String(url).endsWith("/auth/refresh")) {
      const body = JSON.parse(String(init?.body)) as { slug: string; refreshToken: string };
      assert.equal(body.slug, "arulneri");
      assert.equal(body.refreshToken, "refresh-1");
      return new Response(
        JSON.stringify({ accessToken: "access-2", refreshToken: "refresh-2" }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({ userId: "u1", schoolId: "s1", roles: [], permissions: [], scopes: [] }),
      { status: 200 },
    );
  }) as typeof fetch;

  const client = createApiClient({
    baseUrl: "http://localhost:4000",
    getTokens: async () => ({ accessToken: access, refreshToken: refresh }),
    getSlug: async () => "arulneri",
    setTokens: async (tokens) => {
      access = tokens.accessToken;
      refresh = tokens.refreshToken;
    },
    onAuthFailure: async () => {
      authFailed = true;
    },
  });

  await client.me.acl();
  assert.equal(access, "access-2");
  assert.equal(refresh, "refresh-2");
  assert.equal(authFailed, false);
  assert.equal(call, 3);
  console.log("PASS: mobile client refreshes once after 401");

  call = 0;
  authFailed = false;
  access = "access-1";
  refresh = "bad";

  globalThis.fetch = (async () => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }
    return new Response(JSON.stringify({ message: "Invalid refresh token" }), { status: 401 });
  }) as typeof fetch;

  const client2 = createApiClient({
    baseUrl: "http://localhost:4000",
    getTokens: async () => ({ accessToken: access, refreshToken: refresh }),
    getSlug: async () => "arulneri",
    setTokens: async (tokens) => {
      access = tokens.accessToken;
      refresh = tokens.refreshToken;
    },
    onAuthFailure: async () => {
      authFailed = true;
    },
  });

  await assert.rejects(() => client2.me.acl(), ApiError);
  assert.equal(call, 2);
  assert.equal(authFailed, true);
  console.log("PASS: mobile client clears session path on refresh failure");

  console.log("\n✓ Mobile API client refresh tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
