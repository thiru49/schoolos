/**
 * PEO security checks against a running API.
 * Run after seed: pnpm tsx tests/security/people-isolation.ts
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
  const admin = await login("arulneri", "superadmin", "school_super_admin");
  const teacherB = await login("school-b", "TCH-B", "teacher");

  const teacherStudents = (await (await authed(teacher.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
    sectionName: string;
  }[];
  if (!teacherStudents.some((s) => s.fullName.startsWith("Arun"))) throw new Error("teacher missing Arun");
  if (teacherStudents.some((s) => s.fullName.startsWith("Maria"))) {
    throw new Error("teacher 8-A must not list Maria 9-B");
  }

  const adminStudents = (await (await authed(admin.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
  }[];
  const maria = adminStudents.find((s) => s.fullName.startsWith("Maria"));
  const arun = adminStudents.find((s) => s.fullName.startsWith("Arun"));
  if (!maria || !arun) throw new Error("admin missing seeded students");

  const teacherGetsMaria = await authed(teacher.accessToken, `/students/${maria.id}`);
  if (teacherGetsMaria.ok) throw new Error("teacher 8-A must not get Maria");

  const parentStudents = (await (await authed(parent.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
  }[];
  if (!parentStudents.some((s) => s.id === arun.id)) throw new Error("parent must list linked child Arun");
  if (parentStudents.some((s) => s.id === maria.id)) throw new Error("parent must not list Maria");

  const parentGetsMaria = await authed(parent.accessToken, `/students/${maria.id}`);
  if (parentGetsMaria.ok) throw new Error("parent of Arun must not get Maria");

  const studentSelf = (await (await authed(student.accessToken, "/students")).json()) as { id: string }[];
  if (!studentSelf.some((s) => s.id === arun.id)) throw new Error("student must list self");
  if (studentSelf.length !== 1) throw new Error("student must not list classmates via students.read Y");

  const parentWrite = await authed(parent.accessToken, "/students", {
    method: "POST",
    body: JSON.stringify({
      admissionNumber: "X",
      fullName: "X",
      classId: arun.id,
      sectionId: arun.id,
      password: "Password123!",
    }),
  });
  if (parentWrite.ok) throw new Error("parent must not write students");

  const teacherWrite = await authed(teacher.accessToken, `/students/${arun.id}`, {
    method: "PATCH",
    body: JSON.stringify({ fullName: "Hacked" }),
  });
  if (teacherWrite.ok) throw new Error("teacher must not write students");

  const parents = (await (await authed(parent.accessToken, "/parents")).json()) as {
    id: string;
    fullName: string;
  }[];
  if (parents.length !== 1) throw new Error("parent must only see self");
  const otherParent = await authed(parent.accessToken, `/parents/${parents[0].id}`);
  if (!otherParent.ok) throw new Error("parent must read self");

  const adminParents = (await (await authed(admin.accessToken, "/parents")).json()) as { id: string }[];
  const notMine = adminParents.find((p) => p.id !== parents[0].id);
  if (notMine) {
    const peek = await authed(parent.accessToken, `/parents/${notMine.id}`);
    if (peek.ok) throw new Error("parent must not read another parent");
  }

  const teachers = (await (await authed(teacher.accessToken, "/teachers")).json()) as {
    employeeId: string;
  }[];
  if (!teachers.some((t) => t.employeeId === "TCH-8A")) throw new Error("teacher must see self");
  if (teachers.some((t) => t.employeeId === "TCH-B")) throw new Error("teacher must not list school B");

  const adminTeachers = (await (await authed(admin.accessToken, "/teachers")).json()) as { id: string; employeeId: string }[];
  const selfTeacher = adminTeachers.find((t) => t.employeeId === "TCH-8A");
  if (!selfTeacher) throw new Error("admin missing TCH-8A");
  const teacherGetsOther = adminTeachers.find((t) => t.employeeId !== "TCH-8A");
  if (teacherGetsOther) {
    const peek = await authed(teacher.accessToken, `/teachers/${teacherGetsOther.id}`);
    if (peek.ok) throw new Error("teacher must not get another teacher");
  }

  const crossStudents = await authed(teacherB.accessToken, "/students");
  if (crossStudents.ok) {
    const body = (await crossStudents.json()) as { fullName?: string }[];
    if (body.some((s) => s.fullName?.startsWith("Arun"))) throw new Error("school B listed school A students");
  }

  const crossGet = await authed(teacherB.accessToken, `/students/${arun.id}`);
  if (crossGet.ok) throw new Error("school B got school A student");

  const unauth = await fetch(`${API}/students`);
  if (unauth.status !== 401) throw new Error("students list must require auth");

  console.log("PASS: people scope, parent children, teacher self, deny 9-B, deny cross-tenant, deny write");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
