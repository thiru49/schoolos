/**
 * FEE-007 receipt PDF access — permission, student scope, and tenant isolation.
 * Run after seed: pnpm tsx tests/security/fees-receipt-pdf.ts
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
  return (await res.json()) as { accessToken: string };
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

async function issue(token: string, studentId: string, feeHeadId: string) {
  const rec = await authed(token, "/fees", {
    method: "POST",
    body: JSON.stringify({ studentId, feeHeadId, amount: 500, method: "cash" }),
  });
  if (!rec.ok) throw new Error("record failed " + (await rec.text()));
  return (await rec.json()) as Recorded;
}

function isPdf(body: ArrayBuffer): boolean {
  const head = new Uint8Array(body).subarray(0, 5);
  return String.fromCharCode(...head) === "%PDF-";
}

async function main() {
  // ── 1. Unauthenticated → 401 ────────────────────────────────────────────────
  const unauth = await fetch(`${API}/receipts/00000000-0000-4000-8000-000000000001/pdf`);
  if (unauth.status !== 401)
    throw new Error(`unauthenticated /receipts/:id/pdf expected 401, got ${unauth.status}`);

  // ── 2. Log in all personas ──────────────────────────────────────────────────
  const accounts = await login("arulneri", "accounts", "accounts_admin");
  const teacher  = await login("arulneri", "TCH-8A", "teacher");
  const parent   = await login("arulneri", "9000000001", "parent");
  const student  = await login("arulneri", "AN2021-0001", "student");
  const adminB   = await login("school-b", "superadmin", "school_super_admin");

  // ── 3. Seed a receipt for Arun and one for Maria ────────────────────────────
  const students = (await (await authed(accounts.accessToken, "/students")).json()) as Student[];
  const arun  = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  if (!arun || !maria) throw new Error("students missing");

  const headRes = await authed(accounts.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `PDF-${Date.now()}`, amount: 500 }),
  });
  if (!headRes.ok) throw new Error("head failed " + (await headRes.text()));
  const head = (await headRes.json()) as Head;

  const arunReceipt  = await issue(accounts.accessToken, arun.id, head.id);
  const mariaReceipt = await issue(accounts.accessToken, maria.id, head.id);

  // ── 4. Non-UUID id → 404 ────────────────────────────────────────────────────
  const badId = await authed(accounts.accessToken, "/receipts/not-a-uuid/pdf");
  if (badId.status !== 404)
    throw new Error(`non-uuid id expected 404, got ${badId.status}`);

  // ── 5. Unknown UUID → 404 ───────────────────────────────────────────────────
  const missing = await authed(accounts.accessToken, "/receipts/00000000-0000-4000-8000-000000000001/pdf");
  if (missing.status !== 404)
    throw new Error(`unknown receipt PDF expected 404, got ${missing.status}`);

  // ── 6. Teacher (no receipts.read) → 403 ────────────────────────────────────
  const teacherPdf = await authed(teacher.accessToken, `/receipts/${arunReceipt.receiptId}/pdf`);
  if (teacherPdf.status !== 403)
    throw new Error(`teacher PDF expected 403, got ${teacherPdf.status}`);

  // ── 7. accounts_admin: own-tenant receipt → 200 + valid PDF ─────────────────
  const staffPdf = await authed(accounts.accessToken, `/receipts/${arunReceipt.receiptId}/pdf`);
  if (!staffPdf.ok)
    throw new Error(`accounts_admin PDF expected 200, got ${staffPdf.status}`);
  if (staffPdf.headers.get("content-type") !== "application/pdf")
    throw new Error(`expected content-type application/pdf, got ${staffPdf.headers.get("content-type")}`);
  const staffBody = await staffPdf.arrayBuffer();
  if (!isPdf(staffBody))
    throw new Error("staff PDF response does not start with %PDF-");

  // ── 8. Parent: linked child receipt → 200 + valid PDF ──────────────────────
  const parentOk = await authed(parent.accessToken, `/receipts/${arunReceipt.receiptId}/pdf`);
  if (!parentOk.ok)
    throw new Error(`parent linked-child PDF expected 200, got ${parentOk.status}`);
  if (!isPdf(await parentOk.arrayBuffer()))
    throw new Error("parent PDF response invalid");

  // ── 9. Parent: unlinked child receipt → 403 ─────────────────────────────────
  const parentBad = await authed(parent.accessToken, `/receipts/${mariaReceipt.receiptId}/pdf`);
  if (parentBad.status !== 403)
    throw new Error(`parent unlinked-child PDF expected 403, got ${parentBad.status}`);

  // ── 10. Student: own receipt → 200 + valid PDF ──────────────────────────────
  const studentOk = await authed(student.accessToken, `/receipts/${arunReceipt.receiptId}/pdf`);
  if (!studentOk.ok)
    throw new Error(`student own PDF expected 200, got ${studentOk.status}`);
  if (!isPdf(await studentOk.arrayBuffer()))
    throw new Error("student PDF response invalid");

  // ── 11. Student: another student's receipt → 403 ────────────────────────────
  const studentBad = await authed(student.accessToken, `/receipts/${mariaReceipt.receiptId}/pdf`);
  if (studentBad.status !== 403)
    throw new Error(`student other-student PDF expected 403, got ${studentBad.status}`);

  // ── 12. Cross-tenant: School B admin → School A receipt → 404 ───────────────
  const crossAtoB = await authed(adminB.accessToken, `/receipts/${arunReceipt.receiptId}/pdf`);
  if (crossAtoB.ok)
    throw new Error("school-b must not access Arul Neri receipt PDF");
  if (crossAtoB.status !== 404)
    throw new Error(`cross-tenant A→B PDF expected 404, got ${crossAtoB.status}`);

  // ── 13. Cross-tenant reverse: School A admin → School B receipt → 404 ───────
  const studentsB = (await (await authed(adminB.accessToken, "/students")).json()) as Student[];
  const studentB = studentsB[0];
  const headBRes = await authed(adminB.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `PDFB-${Date.now()}`, amount: 500 }),
  });
  if (!headBRes.ok) throw new Error("school-b head failed " + (await headBRes.text()));
  const headB = (await headBRes.json()) as Head;
  const recB = await issue(adminB.accessToken, studentB.id, headB.id);

  const crossBtoA = await authed(accounts.accessToken, `/receipts/${recB.receiptId}/pdf`);
  if (crossBtoA.ok)
    throw new Error("arulneri must not access school-b receipt PDF");
  if (crossBtoA.status !== 404)
    throw new Error(`cross-tenant B→A PDF expected 404, got ${crossBtoA.status}`);

  console.log("PASS: FEE-007 receipt PDF access, scope, tenant isolation");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
