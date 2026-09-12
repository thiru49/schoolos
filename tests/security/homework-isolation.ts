/**
 * HW security checks against a running API.
 * Run after seed: pnpm tsx tests/security/homework-isolation.ts
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

async function main() {
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const parent = await login("arulneri", "9000000001", "parent");
  const student = await login("arulneri", "AN2021-0001", "student");
  const mariaUser = await login("arulneri", "AN2021-0901", "student");
  const admin = await login("arulneri", "superadmin", "school_super_admin");
  const teacherB = await login("school-b", "TCH-B", "teacher");

  const sections = (await (await authed(admin.accessToken, "/academics/sections")).json()) as {
    id: string;
    classId: string;
    label: string;
  }[];
  const eightA = sections.find((s) => s.label === "8-A");
  const nineB = sections.find((s) => s.label === "9-B");
  if (!eightA || !nineB) throw new Error("seed sections missing");

  const due = new Date().toISOString().slice(0, 10);
  const created = await authed(teacher.accessToken, "/homework", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      title: "Algebra worksheet",
      body: "Complete exercise 4",
      dueDate: due,
    }),
  });
  if (!created.ok) throw new Error("teacher 8-A create failed " + (await created.text()));
  const hw8 = (await created.json()) as { id: string };

  const create9 = await authed(teacher.accessToken, "/homework", {
    method: "POST",
    body: JSON.stringify({
      classId: nineB.classId,
      sectionId: nineB.id,
      title: "Should fail",
      body: "no",
      dueDate: due,
    }),
  });
  if (create9.ok) throw new Error("teacher 8-A must not create homework for 9-B");

  const hw9res = await authed(admin.accessToken, "/homework", {
    method: "POST",
    body: JSON.stringify({
      classId: nineB.classId,
      sectionId: nineB.id,
      title: "9-B reading",
      body: "Chapter 2",
      dueDate: due,
    }),
  });
  if (!hw9res.ok) throw new Error("admin create 9-B homework failed " + (await hw9res.text()));
  const hw9 = (await hw9res.json()) as { id: string };

  const teacherGets9 = await authed(teacher.accessToken, `/homework/${hw9.id}`);
  if (teacherGets9.ok) throw new Error("teacher 8-A must not read 9-B homework");

  const parentList = (await (await authed(parent.accessToken, `/homework?studentId=${(await (await authed(parent.accessToken, "/me/children")).json() as { studentId: string }[])[0]?.studentId}`)).json()) as {
    id: string;
    title: string;
  }[];
  if (!parentList.some((h) => h.id === hw8.id)) throw new Error("parent must see Arun 8-A homework");
  if (parentList.some((h) => h.id === hw9.id)) throw new Error("parent must not see 9-B homework");

  const parentGets9 = await authed(parent.accessToken, `/homework/${hw9.id}`);
  if (parentGets9.ok) throw new Error("parent of Arun must not get 9-B homework");

  const parentCreate = await authed(parent.accessToken, "/homework", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      title: "no",
      body: "no",
      dueDate: due,
    }),
  });
  if (parentCreate.ok) throw new Error("parent must not create homework");

  const complete = await authed(student.accessToken, `/homework/${hw8.id}/complete`, { method: "POST" });
  if (!complete.ok) throw new Error("student Arun complete failed " + (await complete.text()));

  const mariaComplete = await authed(mariaUser.accessToken, `/homework/${hw8.id}/complete`, { method: "POST" });
  if (mariaComplete.ok) throw new Error("Maria must not complete 8-A homework");

  const cross = await authed(teacherB.accessToken, `/homework/${hw8.id}`);
  if (cross.ok) throw new Error("school B must not read school A homework");

  const unauth = await fetch(`${API}/homework`);
  if (unauth.status !== 401) throw new Error("homework list must require auth");

  console.log("PASS: homework 8-A create, deny 9-B, parent child scope, student complete, deny cross-tenant");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
