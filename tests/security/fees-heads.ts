/**
 * FEE-001 fee-head write scope, validation, and tenant isolation.
 * Run after seed: pnpm tsx tests/security/fees-heads.ts
 */
const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

async function login(slug: string, identifier: string, roleHint?: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, identifier, password: PASSWORD, roleHint }),
  });
  if (!res.ok) throw new Error(`login ${identifier}@${slug}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ accessToken: string }>;
}

async function authed(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
}

async function main() {
  const unauth = await fetch(`${API}/fee-heads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "X", amount: 1 }),
  });
  if (unauth.status !== 401) throw new Error(`unauthenticated POST /fee-heads expected 401, got ${unauth.status}`);

  const admin = await login("arulneri", "superadmin", "school_super_admin");
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const parent = await login("arulneri", "9000000001", "parent");
  const student = await login("arulneri", "AN2021-0001", "student");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const invalid = await authed(admin.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: "  ", amount: 0 }),
  });
  if (invalid.status !== 400) throw new Error(`invalid head expected 400, got ${invalid.status}`);

  const name = `Tuition-${Date.now()}`;
  const created = await authed(admin.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: ` ${name} `, amount: 12500 }),
  });
  if (!created.ok) throw new Error("create head failed " + (await created.text()));
  const head = (await created.json()) as { id: string; name: string; amount: number };
  if (head.name !== name) throw new Error("fee head name must be trimmed");

  const dup = await authed(admin.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name, amount: 12500 }),
  });
  if (dup.status !== 409) throw new Error(`duplicate head expected 409, got ${dup.status} ${await dup.text()}`);

  for (const [label, token] of [
    ["teacher", teacher.accessToken],
    ["parent", parent.accessToken],
    ["student", student.accessToken],
  ] as const) {
    const res = await authed(token, "/fee-heads", {
      method: "POST",
      body: JSON.stringify({ name: `${label}-${Date.now()}`, amount: 100 }),
    });
    if (res.status !== 403) throw new Error(`${label} POST /fee-heads expected 403, got ${res.status}`);
  }

  const listA = (await (await authed(admin.accessToken, "/fee-heads")).json()) as { name: string }[];
  if (!listA.some((h) => h.name === name)) throw new Error("admin missing created head");

  const listB = (await (await authed(adminB.accessToken, "/fee-heads")).json()) as { name: string }[];
  if (listB.some((h) => h.name === name)) throw new Error("school-b listed Arul Neri fee head");

  const steal = await authed(adminB.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name, amount: 1 }),
  });
  if (!steal.ok) {
    throw new Error("school-b should create the same head name in its own tenant " + steal.status + " " + (await steal.text()));
  }

  console.log("PASS: FEE-001 fee-head scope, duplicate names, tenant isolation");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
