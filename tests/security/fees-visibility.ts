/**
 * FEE-005 parent/student fee visibility and dues.
 * Run after seed: pnpm tsx tests/security/fees-visibility.ts
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
type Head = { id: string; amount: number };
type Summary = { studentId: string; headsTotal: number; paidTotal: number; dues: number };
type Payment = { studentName: string; amount: number; receiptId: string | null };

async function main() {
  const unauth = await fetch(`${API}/fees/summary`);
  if (unauth.status !== 401) throw new Error(`unauthenticated GET /fees/summary expected 401, got ${unauth.status}`);
  const unauthList = await fetch(`${API}/fees`);
  if (unauthList.status !== 401) throw new Error(`unauthenticated GET /fees expected 401, got ${unauthList.status}`);

  const accounts = await login("arulneri", "accounts", "accounts_admin");
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const parent = await login("arulneri", "9000000001", "parent");
  const student = await login("arulneri", "AN2021-0001", "student");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const teacherSummary = await authed(teacher.accessToken, "/fees/summary");
  if (teacherSummary.status !== 403) {
    throw new Error(`teacher GET /fees/summary expected 403, got ${teacherSummary.status}`);
  }
  const teacherList = await authed(teacher.accessToken, "/fees");
  if (teacherList.status !== 403) throw new Error(`teacher GET /fees expected 403, got ${teacherList.status}`);

  const students = (await (await authed(accounts.accessToken, "/students")).json()) as Student[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  if (!arun || !maria) throw new Error("students missing");

  const parentMissing = await authed(parent.accessToken, "/fees/summary");
  if (parentMissing.status !== 400) {
    throw new Error(`parent summary without studentId expected 400, got ${parentMissing.status}`);
  }
  const parentMaria = await authed(parent.accessToken, `/fees/summary?studentId=${maria.id}`);
  if (parentMaria.status !== 403) {
    throw new Error(`parent Arun must not see Maria dues, got ${parentMaria.status}`);
  }
  const parentMariaList = await authed(parent.accessToken, `/fees?studentId=${maria.id}`);
  if (parentMariaList.status !== 403) {
    throw new Error(`parent Arun must not list Maria fees, got ${parentMariaList.status}`);
  }

  const studentMaria = await authed(student.accessToken, `/fees/summary?studentId=${maria.id}`);
  if (studentMaria.status !== 403) {
    throw new Error(`student must not see Maria dues, got ${studentMaria.status}`);
  }
  const studentMariaList = await authed(student.accessToken, `/fees?studentId=${maria.id}`);
  if (studentMariaList.status !== 403) {
    throw new Error(`student must not list Maria fees, got ${studentMariaList.status}`);
  }

  const beforeRes = await authed(parent.accessToken, `/fees/summary?studentId=${arun.id}`);
  if (!beforeRes.ok) throw new Error("parent Arun summary failed " + (await beforeRes.text()));
  const before = (await beforeRes.json()) as Summary;
  if (before.studentId !== arun.id) throw new Error("summary student mismatch");
  if (before.dues !== Math.max(0, before.headsTotal - before.paidTotal)) {
    throw new Error("dues must be max(0, headsTotal - paidTotal)");
  }

  const headRes = await authed(accounts.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `Vis-${Date.now()}`, amount: 300 }),
  });
  if (!headRes.ok) throw new Error("create head failed " + (await headRes.text()));
  const head = (await headRes.json()) as Head;
  const pay = await authed(accounts.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({ studentId: arun.id, feeHeadId: head.id, amount: 120, method: "cash" }),
  });
  if (!pay.ok) throw new Error("record failed " + (await pay.text()));
  const issued = (await pay.json()) as { receiptId: string };

  const afterRes = await authed(parent.accessToken, `/fees/summary?studentId=${arun.id}`);
  const after = (await afterRes.json()) as Summary;
  if (after.headsTotal !== before.headsTotal + 300) {
    throw new Error(`headsTotal expected ${before.headsTotal + 300}, got ${after.headsTotal}`);
  }
  if (after.paidTotal !== before.paidTotal + 120) {
    throw new Error(`paidTotal expected ${before.paidTotal + 120}, got ${after.paidTotal}`);
  }
  if (after.dues !== Math.max(0, after.headsTotal - after.paidTotal)) {
    throw new Error("dues did not follow heads − payments");
  }

  const parentList = (await (await authed(parent.accessToken, `/fees?studentId=${arun.id}`)).json()) as Payment[];
  if (parentList.some((p) => p.studentName.startsWith("Maria"))) {
    throw new Error("parent fee list leaked Maria");
  }

  const studentSelf = await authed(student.accessToken, "/fees/summary");
  if (!studentSelf.ok) throw new Error("student self summary failed " + studentSelf.status);
  const selfSummary = (await studentSelf.json()) as Summary;
  if (selfSummary.studentId !== arun.id) throw new Error("student self summary must be Arun");

  const parentReceipt = await authed(parent.accessToken, `/receipts/${issued.receiptId}`);
  if (!parentReceipt.ok) throw new Error("parent must read linked receipt " + parentReceipt.status);

  const mariaPay = await authed(accounts.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({ studentId: maria.id, feeHeadId: head.id, amount: 50, method: "upi" }),
  });
  const mariaIssued = (await mariaPay.json()) as { receiptId: string };
  const arunAfterMaria = (await (await authed(parent.accessToken, `/fees/summary?studentId=${arun.id}`)).json()) as Summary;
  if (arunAfterMaria.paidTotal !== after.paidTotal) {
    throw new Error("Maria payment must not change Arun paidTotal");
  }
  const parentMariaReceipt = await authed(parent.accessToken, `/receipts/${mariaIssued.receiptId}`);
  if (parentMariaReceipt.status !== 403) {
    throw new Error(`parent must not read Maria receipt, got ${parentMariaReceipt.status}`);
  }
  const studentMariaReceipt = await authed(student.accessToken, `/receipts/${mariaIssued.receiptId}`);
  if (studentMariaReceipt.status !== 403) {
    throw new Error(`student must not read Maria receipt, got ${studentMariaReceipt.status}`);
  }

  const cross = await authed(adminB.accessToken, `/fees/summary?studentId=${arun.id}`);
  if (cross.ok) throw new Error("school-b must not read Arun dues");
  if (cross.status !== 403 && cross.status !== 404) {
    throw new Error(`school-b Arun summary expected 403/404, got ${cross.status}`);
  }
  const crossList = await authed(adminB.accessToken, `/fees?studentId=${arun.id}`);
  if (crossList.ok) {
    const rows = (await crossList.json()) as Payment[];
    if (rows.length > 0) throw new Error("school-b listed Arun fees");
  } else if (crossList.status !== 403 && crossList.status !== 404) {
    throw new Error(`school-b Arun list expected 403/404/empty, got ${crossList.status}`);
  }

  console.log("PASS: FEE-005 parent/student visibility and dues");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
