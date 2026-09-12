/**
 * ATT-001 security checks against a running API.
 * Run after seed: pnpm tsx tests/security/attendance-isolation.ts
 */
const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

async function login(slug: string, identifier: string, roleHint?: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, identifier, password: PASSWORD, roleHint }),
  });
  if (!res.ok) throw new Error(`login ${identifier}: ${res.status} ${await res.text()}`);
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const branding = await fetch(`${API}/public/tenants/arulneri/branding`);
  if (!branding.ok) throw new Error("branding failed");
  const brand = (await branding.json()) as { schoolName: string; receiptPrefix: string };
  if (brand.schoolName !== "Arul Neri Academy") throw new Error("unexpected school name");
  if (brand.receiptPrefix !== "ANA/26-27") throw new Error("unexpected receipt prefix");

  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const sectionsRes = await authed(teacher.accessToken, "/academics/sections");
  const sections = (await sectionsRes.json()) as { id: string; label: string }[];
  const eightA = sections.find((s) => s.label === "8-A");
  const nineB = sections.find((s) => s.label === "9-B");
  if (!eightA) throw new Error("8-A missing from teacher sections — got " + JSON.stringify(sections));
  if (nineB) throw new Error("teacher of 8-A must not see 9-B");

  const rosterRes = await authed(
    teacher.accessToken,
    `/attendance/roster?sectionId=${eightA.id}&date=${today()}`,
  );
  if (!rosterRes.ok) throw new Error("roster failed " + (await rosterRes.text()));
  const roster = (await rosterRes.json()) as { rows: { studentId: string; fullName: string }[] };
  const arun = roster.rows.find((r) => r.fullName.startsWith("Arun"));
  if (!arun) throw new Error("Arun missing from 8-A roster");

  const markOk = await authed(teacher.accessToken, "/attendance", {
    method: "PUT",
    body: JSON.stringify({
      sectionId: eightA.id,
      date: today(),
      marks: [{ studentId: arun.studentId, status: "P" }],
    }),
  });
  if (!markOk.ok) throw new Error("mark 8-A failed " + (await markOk.text()));

  const parent = await login("arulneri", "9000000001", "parent");
  const pushSave = await authed(parent.accessToken, "/me/push-token", {
    method: "POST",
    body: JSON.stringify({ token: "ExponentPushToken[attendance-slice-test]" }),
  });
  if (!pushSave.ok) throw new Error("parent push token save failed " + (await pushSave.text()));
  const kidsRes = await authed(parent.accessToken, "/me/children");
  const kids = (await kidsRes.json()) as { studentId: string; fullName: string }[];
  if (!kids.some((k) => k.studentId === arun.studentId)) throw new Error("parent missing Arun");
  const view = await authed(parent.accessToken, `/attendance?studentId=${arun.studentId}`);
  if (!view.ok) throw new Error("parent cannot read Arun attendance");

  const mariaUser = await login("arulneri", "AN2021-0901", "student");
  const mariaMe = await authed(mariaUser.accessToken, "/me/acl");
  const mariaAcl = (await mariaMe.json()) as { scopes: { studentId?: string; type: string }[] };
  const mariaId = mariaAcl.scopes.find((s) => s.type === "self")?.studentId;
  if (!mariaId) throw new Error("maria self scope missing");

  const teacherMarksMaria = await authed(teacher.accessToken, "/attendance", {
    method: "PUT",
    body: JSON.stringify({
      sectionId: eightA.id,
      date: today(),
      marks: [{ studentId: mariaId, status: "P" }],
    }),
  });
  if (teacherMarksMaria.ok) throw new Error("teacher 8-A must not mark Maria (9-B)");

  const parentReadsMaria = await authed(parent.accessToken, `/attendance?studentId=${mariaId}`);
  if (parentReadsMaria.ok) throw new Error("parent of Arun must not read Maria");

  const teacherB = await login("school-b", "TCH-B", "teacher");
  const cross = await authed(
    teacherB.accessToken,
    `/attendance/roster?sectionId=${eightA.id}&date=${today()}`,
  );
  if (cross.ok) {
    const body = (await cross.json()) as { rows?: unknown[] };
    if (body.rows && body.rows.length > 0) throw new Error("school B read school A roster");
  }

  const from = `${today().slice(0, 8)}01`;
  const history = await authed(
    parent.accessToken,
    `/attendance?studentId=${arun.studentId}&from=${from}&to=${today()}`,
  );
  if (!history.ok) throw new Error("parent date-range history failed " + (await history.text()));

  const parentRangeMaria = await authed(
    parent.accessToken,
    `/attendance?studentId=${mariaId}&from=${from}&to=${today()}`,
  );
  if (parentRangeMaria.ok) throw new Error("parent of Arun must not read Maria via date range");

  const exportDay = await authed(
    teacher.accessToken,
    `/attendance/export?sectionId=${eightA.id}&date=${today()}`,
  );
  if (!exportDay.ok) throw new Error("teacher day export failed " + (await exportDay.text()));
  const dayCsv = await exportDay.text();
  if (!dayCsv.includes("admission_number,full_name,status")) throw new Error("day CSV header missing");

  const exportRange = await authed(
    teacher.accessToken,
    `/attendance/export?sectionId=${eightA.id}&from=${from}&to=${today()}`,
  );
  if (!exportRange.ok) throw new Error("teacher range export failed " + (await exportRange.text()));
  const rangeCsv = await exportRange.text();
  if (!rangeCsv.includes("admission_number,full_name,present,absent,late,holiday")) {
    throw new Error("range CSV header missing");
  }

  const parentExport = await authed(
    parent.accessToken,
    `/attendance/export?sectionId=${eightA.id}&date=${today()}`,
  );
  if (parentExport.ok) throw new Error("parent must not export attendance");

  const crossExport = await authed(
    teacherB.accessToken,
    `/attendance/export?sectionId=${eightA.id}&from=${from}&to=${today()}`,
  );
  if (crossExport.ok) {
    const body = await crossExport.text();
    if (body.includes("Arun")) throw new Error("school B exported school A attendance");
  }

  console.log("PASS: branding, 8-A mark, parent Arun, deny 9-B, deny cross-tenant, history range, CSV export");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
