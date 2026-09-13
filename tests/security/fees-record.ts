/**
 * FEE-002 fee recording validation, accounts_admin, and scopes.
 * Run after seed: pnpm tsx tests/security/fees-record.ts
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
type Recorded = { receiptNumber: string; method: string; amount: number };

async function main() {
  const unauthGet = await fetch(`${API}/fees`);
  if (unauthGet.status !== 401) throw new Error(`unauthenticated GET /fees expected 401, got ${unauthGet.status}`);
  const unauthPost = await fetch(`${API}/fees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (unauthPost.status !== 401) throw new Error(`unauthenticated POST /fees expected 401, got ${unauthPost.status}`);

  const accounts = await login("arulneri", "accounts", "accounts_admin");
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const parent = await login("arulneri", "9000000001", "parent");
  const student = await login("arulneri", "AN2021-0001", "student");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const acl = (await (await authed(accounts.accessToken, "/me/acl")).json()) as {
    roles: string[];
    permissions: string[];
    scopes: { type: string }[];
  };
  if (!acl.roles.includes("accounts_admin")) throw new Error("accounts user missing accounts_admin role");
  for (const p of ["fees.read", "fees.structure.write", "fees.record", "receipts.read"]) {
    if (!acl.permissions.includes(p)) throw new Error("accounts missing " + p);
  }
  if (!acl.scopes.some((s) => s.type === "school")) throw new Error("accounts missing school scope");

  const branding = (await (await fetch(`${API}/public/tenants/arulneri/branding`)).json()) as {
    receiptPrefix: string;
  };
  const preview = (await (await authed(accounts.accessToken, "/fees/preview-number")).json()) as { preview: string };
  if (!preview.preview.startsWith(branding.receiptPrefix + "/")) {
    throw new Error("preview must use tenant receiptPrefix, got " + preview.preview);
  }
  if (preview.preview.includes("ANA/26-27") && branding.receiptPrefix !== "ANA/26-27") {
    throw new Error("preview hardcoded ANA against branding");
  }

  const students = (await (await authed(accounts.accessToken, "/students")).json()) as Student[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  if (!arun || !maria) throw new Error("students missing");

  const headRes = await authed(accounts.accessToken, "/fee-heads", {
    method: "POST",
    body: JSON.stringify({ name: `Rec-${Date.now()}`, amount: 2500 }),
  });
  if (!headRes.ok) throw new Error("accounts create head failed " + (await headRes.text()));
  const head = (await headRes.json()) as Head;

  const invalid = await authed(accounts.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({ studentId: "not-a-uuid", feeHeadId: head.id, amount: -1, method: "card" }),
  });
  if (invalid.status !== 400) throw new Error(`invalid record expected 400, got ${invalid.status}`);

  const missingStudent = await authed(accounts.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({
      studentId: "00000000-0000-4000-8000-000000000099",
      feeHeadId: head.id,
      amount: 2500,
      method: "cash",
    }),
  });
  if (missingStudent.status !== 404) throw new Error(`unknown student expected 404, got ${missingStudent.status}`);

  const teacherRecord = await authed(teacher.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({ studentId: arun.id, feeHeadId: head.id, amount: 2500, method: "cash" }),
  });
  if (teacherRecord.status !== 403) throw new Error(`teacher record expected 403, got ${teacherRecord.status}`);

  for (const [label, token] of [
    ["parent", parent.accessToken],
    ["student", student.accessToken],
  ] as const) {
    const res = await authed(token, "/fees", {
      method: "POST",
      body: JSON.stringify({ studentId: arun.id, feeHeadId: head.id, amount: 2500, method: "upi" }),
    });
    if (res.status !== 403) throw new Error(`${label} record expected 403, got ${res.status}`);
  }

  for (const method of ["cash", "upi", "bank"] as const) {
    const rec = await authed(accounts.accessToken, "/fees", {
      method: "POST",
      body: JSON.stringify({ studentId: arun.id, feeHeadId: head.id, amount: 500, method }),
    });
    if (!rec.ok) throw new Error(`accounts ${method} failed ` + (await rec.text()));
    const body = (await rec.json()) as Recorded;
    if (body.method !== method) throw new Error("method not persisted");
    if (!body.receiptNumber.startsWith(branding.receiptPrefix + "/")) {
      throw new Error("issued number must use tenant prefix " + body.receiptNumber);
    }
  }

  const parentOk = await authed(parent.accessToken, `/fees?studentId=${arun.id}`);
  if (!parentOk.ok) throw new Error("parent must read linked child fees " + parentOk.status);
  const parentBad = await authed(parent.accessToken, `/fees?studentId=${maria.id}`);
  if (parentBad.status !== 403) throw new Error(`parent other child expected 403, got ${parentBad.status}`);

  const studentOk = await authed(student.accessToken, `/fees?studentId=${arun.id}`);
  if (!studentOk.ok) throw new Error("student must read self fees " + studentOk.status);
  const studentBad = await authed(student.accessToken, `/fees?studentId=${maria.id}`);
  if (studentBad.status !== 403) throw new Error(`student other expected 403, got ${studentBad.status}`);

  const studentsB = (await (await authed(adminB.accessToken, "/students")).json()) as Student[];
  const stealStudent = await authed(accounts.accessToken, "/fees", {
    method: "POST",
    body: JSON.stringify({
      studentId: studentsB[0].id,
      feeHeadId: head.id,
      amount: 500,
      method: "cash",
    }),
  });
  if (stealStudent.status !== 404) {
    throw new Error(`recording school-b student from arulneri expected 404, got ${stealStudent.status}`);
  }

  const listB = (await (await authed(adminB.accessToken, "/fees")).json()) as { receiptNumber: string }[];
  if (listB.some((r) => r.receiptNumber.startsWith(branding.receiptPrefix + "/"))) {
    throw new Error("school-b list leaked Arul Neri receipts");
  }

  console.log("PASS: FEE-002 recording validation, accounts_admin, scopes");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
