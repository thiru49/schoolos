/**
 * FEE-003 receipt sequence uniqueness and tenant isolation.
 * Run after seed: pnpm tsx tests/security/fees-numbering.ts
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

type Student = { id: string; fullName: string };
type Head = { id: string; name: string; amount: number };
type Recorded = { receiptNumber: string; receiptId: string | null };

async function main() {
  const unauth = await fetch(`${API}/fees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (unauth.status !== 401) throw new Error(`unauthenticated POST /fees expected 401, got ${unauth.status}`);

  const admin = await login("arulneri", "superadmin", "school_super_admin");
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const teacherRecord = await authed(teacher.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({
      studentId: "00000000-0000-4000-8000-000000000001",
      feeHeadId: "00000000-0000-4000-8000-000000000002",
      amount: 100,
      method: "cash",
    }),
  });
  if (teacherRecord.status !== 403) {
    throw new Error(`teacher POST /fees expected 403, got ${teacherRecord.status}`);
  }

  const students = (await (await authed(admin.accessToken, "/students")).json()) as Student[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  if (!arun) throw new Error("Arun missing");

  const headRes = await authed(admin.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `Num-${Date.now()}`, amount: 1000 }),
  });
  if (!headRes.ok) throw new Error("create head failed " + (await headRes.text()));
  const head = (await headRes.json()) as Head;

  const CONCURRENCY = 8;
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) =>
      authed(admin.accessToken, "/fees", {
        method: "POST",
        body: JSON.stringify({
          studentId: arun.id,
          feeHeadId: head.id,
          amount: 1000 + i,
          method: i % 2 === 0 ? "cash" : "upi",
        }),
      }),
    ),
  );
  const bodies: Recorded[] = [];
  for (const res of results) {
    if (!res.ok) throw new Error("concurrent record failed " + res.status + " " + (await res.text()));
    bodies.push((await res.json()) as Recorded);
  }
  const numbers = bodies.map((b) => b.receiptNumber);
  if (new Set(numbers).size !== CONCURRENCY) {
    throw new Error("duplicate receipt numbers under concurrency: " + numbers.join(", "));
  }
  const seqs = numbers.map((n) => {
    const m = /^ANA\/26-27\/(\d+)$/.exec(n);
    if (!m) throw new Error("unexpected Arul Neri receipt format " + n);
    return Number(m[1]);
  });
  if (new Set(seqs).size !== CONCURRENCY) throw new Error("duplicate seq under concurrency");

  const studentsB = (await (await authed(adminB.accessToken, "/students")).json()) as Student[];
  const studentB = studentsB.find((s) => s.fullName.startsWith("School B"));
  if (!studentB) throw new Error("School B student missing");
  const headBRes = await authed(adminB.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `NumB-${Date.now()}`, amount: 500 }),
  });
  if (!headBRes.ok) throw new Error("school-b head failed " + (await headBRes.text()));
  const headB = (await headBRes.json()) as Head;
  const recB = await authed(adminB.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({
      studentId: studentB.id,
      feeHeadId: headB.id,
      amount: 500,
      method: "bank",
    }),
  });
  if (!recB.ok) throw new Error("school-b record failed " + (await recB.text()));
  const bodyB = (await recB.json()) as Recorded;
  if (!/^SB\/26-27\/\d+$/.test(bodyB.receiptNumber)) {
    throw new Error("school-b must use SB/26-27 prefix, got " + bodyB.receiptNumber);
  }
  if (bodyB.receiptNumber.startsWith("ANA/")) throw new Error("school-b issued ANA prefix");

  const peek = await authed(adminB.accessToken, `/receipts/${bodies[0].receiptId}`);
  if (peek.ok) throw new Error("school-b must not read Arul Neri receipt");
  if (peek.status !== 404 && peek.status !== 403) {
    throw new Error(`cross-tenant receipt expected 404/403, got ${peek.status}`);
  }

  const listB = (await (await authed(adminB.accessToken, "/fees")).json()) as { receiptNumber: string }[];
  if (listB.some((r) => r.receiptNumber.startsWith("ANA/"))) {
    throw new Error("school-b fees list leaked Arul Neri receipts");
  }

  console.log("PASS: FEE-003 unique concurrent seq + tenant prefixes");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
