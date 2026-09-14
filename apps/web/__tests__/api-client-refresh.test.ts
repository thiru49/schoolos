import assert from "node:assert/strict";
import { createApiClient, ApiError } from "@schoolos/api-client";

async function main() {
  console.log("Starting API client refresh tests...");

  type FetchCall = { url: string; init?: RequestInit };

  function mockFetch(
    handlers: Array<(url: string, init?: RequestInit) => Promise<Response>>,
  ) {
    const calls: FetchCall[] = [];
    let index = 0;
    const fetchFn = async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const handler = handlers[index++];
      if (!handler) throw new Error(`unexpected fetch call #${index}: ${url}`);
      return handler(url, init);
    };
    return { fetchFn, calls };
  }

  let access = "access-1";
  let refresh = "refresh-1";
  let authFailed = false;

  const { fetchFn, calls } = mockFetch([
    async () =>
      new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    async (url, init) => {
      assert.equal(url.endsWith("/auth/refresh"), true);
      const body = JSON.parse(String(init?.body)) as { slug: string; refreshToken: string };
      assert.equal(body.slug, "arulneri");
      assert.equal(body.refreshToken, "refresh-1");
      return new Response(
        JSON.stringify({ accessToken: "access-2", refreshToken: "refresh-2" }),
        { status: 200 },
      );
    },
    async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ]);

  globalThis.fetch = fetchFn as typeof fetch;

  const client = createApiClient({
    baseUrl: "http://localhost:4000",
    getTokens: () => ({ accessToken: access, refreshToken: refresh }),
    getSlug: () => "arulneri",
    setTokens: (tokens) => {
      access = tokens.accessToken ?? access;
      refresh = tokens.refreshToken ?? refresh;
    },
    onAuthFailure: () => {
      authFailed = true;
    },
  });

  await client.me.acl();
  assert.equal(access, "access-2");
  assert.equal(refresh, "refresh-2");
  assert.equal(authFailed, false);
  assert.equal(calls.length, 3);
  console.log("PASS: client refreshes once after 401 and retries original request");

  let refreshCount = 0;
  authFailed = false;
  access = "access-1";
  refresh = "bad-refresh";

  const failing = mockFetch([
    async () => new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }),
    async () => {
      refreshCount += 1;
      return new Response(JSON.stringify({ message: "Invalid refresh token" }), { status: 401 });
    },
  ]);

  globalThis.fetch = failing.fetchFn as typeof fetch;

  const client2 = createApiClient({
    baseUrl: "http://localhost:4000",
    getTokens: () => ({ accessToken: access, refreshToken: refresh }),
    getSlug: () => "arulneri",
    setTokens: (tokens) => {
      access = tokens.accessToken ?? access;
      refresh = tokens.refreshToken ?? refresh;
    },
    onAuthFailure: () => {
      authFailed = true;
    },
  });

  await assert.rejects(() => client2.me.acl(), ApiError);
  assert.equal(refreshCount, 1);
  assert.equal(authFailed, true);
  console.log("PASS: failed refresh triggers onAuthFailure without infinite loop");

  console.log("\n✓ API client refresh tests passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
