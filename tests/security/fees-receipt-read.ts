/**
 * FEE-004 receipt read permission, student scope, tenant isolation.
 * Run after seed: pnpm tsx tests/security/fees-receipt-read.ts
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
type Head = { id: string };
type Recorded = { receiptId: string; receiptNumber: string };

async function issue(
  token: string,
  studentId: string,
  feeHeadId: string,
  method: "cash" | "upi" | "bank" = "cash",
) {
  const rec = await authed(token, "/fees", {
    method: "POST",
    body: JSON.stringify({ studentId, feeHeadId, amount: 750, method }),
  });
  if (!rec.ok) throw new Error("record failed " + (await rec.text()));
  return (await rec.json()) as Recorded;
}

async function main() {
  const unauth = await fetch(`${API}/receipts/00000000-0000-4000-8000-000000000001`);
  if (unauth.status !== 401) throw new Error(`unauthenticated GET /receipts/:id expected 401, got ${unauth.status}`);

  const accounts = await login("arulneri", "accounts", "accounts_admin");
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const parent = await login("arulneri", "9000000001", "parent");
  const student = await login("arulneri", "AN2021-0001", "student");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const students = (await (await authed(accounts.accessToken, "/students")).json()) as Student[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  if (!arun || !maria) throw new Error("students missing");

  const headRes = await authed(accounts.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `Rcpt-${Date.now()}`, amount: 750 }),
  });
  if (!headRes.ok) throw new Error("head failed " + (await headRes.text()));
  const head = (await headRes.json()) as Head;

  const arunReceipt = await issue(accounts.accessToken, arun.id, head.id, "upi");
  const mariaReceipt = await issue(accounts.accessToken, maria.id, head.id, "bank");

  const missing = await authed(accounts.accessToken, "/receipts/00000000-0000-4000-8000-000000000001");
  if (missing.status !== 404) throw new Error(`unknown receipt expected 404, got ${missing.status}`);
  const badId = await authed(accounts.accessToken, "/receipts/not-a-uuid");
  if (badId.status !== 404) throw new Error(`invalid id expected 404, got ${badId.status}`);

  const staffOk = await authed(accounts.accessToken, `/receipts/${arunReceipt.receiptId}`);
  if (!staffOk.ok) throw new Error("accounts must read in-tenant receipt " + staffOk.status);
  const staffBody = (await staffOk.json()) as { number: string; method: string; studentName: string };
  if (staffBody.number !== arunReceipt.receiptNumber) throw new Error("receipt number mismatch");
  if (staffBody.method !== "upi") throw new Error("method mismatch");
  if (!staffBody.studentName.startsWith("Arun")) throw new Error("student mismatch");

  const teacherPeek = await authed(teacher.accessToken, `/receipts/${arunReceipt.receiptId}`);
  if (teacherPeek.status !== 403) throw new Error(`teacher GET receipt expected 403, got ${teacherPeek.status}`);

  const parentOk = await authed(parent.accessToken, `/receipts/${arunReceipt.receiptId}`);
  if (!parentOk.ok) throw new Error("parent must read linked child receipt " + parentOk.status);
  const parentBad = await authed(parent.accessToken, `/receipts/${mariaReceipt.receiptId}`);
  if (parentBad.status !== 403) throw new Error(`parent other-child receipt expected 403, got ${parentBad.status}`);

  const studentOk = await authed(student.accessToken, `/receipts/${arunReceipt.receiptId}`);
  if (!studentOk.ok) throw new Error("student must read self receipt " + studentOk.status);
  const studentBad = await authed(student.accessToken, `/receipts/${mariaReceipt.receiptId}`);
  if (studentBad.status !== 403) throw new Error(`student other receipt expected 403, got ${studentBad.status}`);

  const cross = await authed(adminB.accessToken, `/receipts/${arunReceipt.receiptId}`);
  if (cross.ok) throw new Error("school-b must not read Arul Neri receipt");
  if (cross.status !== 404 && cross.status !== 403) {
    throw new Error(`cross-tenant receipt expected 404/403, got ${cross.status}`);
  }

  const studentsB = (await (await authed(adminB.accessToken, "/students")).json()) as Student[];
  const studentB = studentsB[0];
  const headBRes = await authed(adminB.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `RcptB-${Date.now()}`, amount: 400 }),
  });
  if (!headBRes.ok) throw new Error("school-b head failed " + (await headBRes.text()));
  const headB = (await headBRes.json()) as Head;
  const recB = await issue(adminB.accessToken, studentB.id, headB.id);
  const steal = await authed(accounts.accessToken, `/receipts/${recB.receiptId}`);
  if (steal.ok) throw new Error("arulneri must not read school-b receipt");
  if (steal.status !== 404 && steal.status !== 403) {
    throw new Error(`cross-tenant reverse expected 404/403, got ${steal.status}`);
  }

  console.log("PASS: FEE-004 receipt read permission, scope, tenant isolation");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
