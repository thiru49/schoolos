/**
 * AUTH-REFRESH-001 — refresh token lifecycle and tenant isolation.
 * Run against seeded API: pnpm tsx tests/security/auth-refresh.ts
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";
const prisma = new PrismaClient();

type LoginResult = { accessToken: string; refreshToken: string; user: { schoolId: string } };

async function login(slug: string, identifier: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, identifier, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as LoginResult;
}

async function refresh(slug: string, refreshToken: string) {
  return fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, refreshToken }),
  });
}

async function authed(token: string, path: string) {
  return fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

function hash(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

async function main() {
  const schoolA = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  const schoolB = await prisma.school.findFirst({ where: { slug: "school-b" } });
  if (!schoolA || !schoolB) throw new Error("seed schools missing");

  const session = await login("arulneri", "superadmin");
  if (!session.accessToken || !session.refreshToken) throw new Error("login missing tokens");
  console.log("PASS: login returns access + refresh token");

  const aclRes = await authed(session.accessToken, "/me/acl");
  if (!aclRes.ok) throw new Error(`acl with access token failed: ${aclRes.status}`);
  console.log("PASS: access token works for /me/acl");

  const crossTenantSession = await login("arulneri", "superadmin");
  const crossTenant = await refresh("school-b", crossTenantSession.refreshToken);
  if (crossTenant.status !== 401) {
    throw new Error(`expected 401 for cross-tenant refresh, got ${crossTenant.status}`);
  }
  console.log("PASS: cross-tenant refresh rejected");

  const refreshRes = await refresh("arulneri", session.refreshToken);
  if (!refreshRes.ok) throw new Error(`refresh failed: ${refreshRes.status} ${await refreshRes.text()}`);
  const rotated = (await refreshRes.json()) as { accessToken: string; refreshToken: string };
  if (!rotated.accessToken || !rotated.refreshToken) throw new Error("refresh missing tokens");
  console.log("PASS: refresh succeeds with valid token under tenant slug");

  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.school_id', ${schoolA.id}, true)`;
    return tx.refreshToken.findFirst({
      where: { schoolId: schoolA.id, tokenHash: hash(rotated.refreshToken) },
    });
  });
  if (!row) throw new Error("rotated refresh token not visible under FORCE RLS with school context");
  console.log("PASS: refresh token row visible under FORCE RLS with school context");

  const reuse = await refresh("arulneri", session.refreshToken);
  if (reuse.status !== 401) throw new Error("old refresh token should be rejected after rotation");
  console.log("PASS: refresh-token rotation invalidates previous token");

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.school_id', ${schoolA.id}, true)`;
    await tx.refreshToken.update({
      where: { id: row.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
  });
  const expired = await refresh("arulneri", rotated.refreshToken);
  if (expired.status !== 401) throw new Error("expired refresh token should be rejected");
  console.log("PASS: expired refresh token rejected");

  const fresh = await login("arulneri", "superadmin");
  const logoutRes = await fetch(`${API}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${fresh.accessToken}` },
  });
  if (!logoutRes.ok) throw new Error(`logout failed: ${logoutRes.status}`);
  const revoked = await refresh("arulneri", fresh.refreshToken);
  if (revoked.status !== 401) throw new Error("logout should revoke refresh tokens");
  console.log("PASS: logout revokes refresh token");

  await prisma.$disconnect();
  console.log("\n✓ AUTH-REFRESH-001 security gate passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
