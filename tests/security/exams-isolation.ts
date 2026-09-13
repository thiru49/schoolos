/**
 * EXM-001 security checks against a running API.
 * Run after seed: pnpm tsx tests/security/exams-isolation.ts
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

  const sections = (await (await authed(admin.accessToken, "/academics/sections")).json()) as {
    id: string;
    classId: string;
    label: string;
  }[];
  const eightA = sections.find((s) => s.label === "8-A");
  const nineB = sections.find((s) => s.label === "9-B");
  if (!eightA || !nineB) throw new Error("seed sections missing");

  const subjectRes = await authed(admin.accessToken, "/subjects", {
    method: "POST",
    body: JSON.stringify({ name: `ExamSub-${Date.now()}` }),
  });
  if (!subjectRes.ok) throw new Error("subject create failed " + (await subjectRes.text()));
  const subject = (await subjectRes.json()) as { id: string };

  const teacherCreate = await authed(teacher.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: subject.id,
      name: "Should fail",
      examDate: "2026-09-20",
      maxScore: 100,
    }),
  });
  if (teacherCreate.ok) throw new Error("teacher must not create exams");

  const missingSubject = await authed(admin.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: "00000000-0000-4000-8000-000000000000",
      name: "Bad subject",
      examDate: "2026-09-20",
      maxScore: 100,
    }),
  });
  if (missingSubject.ok) throw new Error("create must require a valid subject");

  const created8 = await authed(admin.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: subject.id,
      name: "Term 1 Maths 8-A",
      examDate: "2026-09-20",
      maxScore: 100,
    }),
  });
  if (!created8.ok) throw new Error("admin create 8-A exam failed " + (await created8.text()));
  const exam8 = (await created8.json()) as { id: string };

  const created9 = await authed(admin.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: nineB.classId,
      sectionId: nineB.id,
      subjectId: subject.id,
      name: "Term 1 Maths 9-B",
      examDate: "2026-09-21",
      maxScore: 100,
    }),
  });
  if (!created9.ok) throw new Error("admin create 9-B exam failed " + (await created9.text()));
  const exam9 = (await created9.json()) as { id: string };

  const teacherList8 = (await (await authed(teacher.accessToken, `/exams?sectionId=${eightA.id}`)).json()) as {
    id: string;
  }[];
  if (!teacherList8.some((e) => e.id === exam8.id)) throw new Error("teacher must list 8-A exam");

  const teacherList9 = await authed(teacher.accessToken, `/exams?sectionId=${nineB.id}`);
  if (teacherList9.ok) throw new Error("teacher 8-A must not list 9-B exams");

  const teacherGet9 = await authed(teacher.accessToken, `/exams/${exam9.id}`);
  if (teacherGet9.ok) throw new Error("teacher 8-A must not get 9-B exam");

  const children = (await (await authed(parent.accessToken, "/me/children")).json()) as { studentId: string }[];
  const arunId = children[0]?.studentId;
  if (!arunId) throw new Error("parent children missing");

  const parentList = (await (await authed(parent.accessToken, `/exams?studentId=${arunId}`)).json()) as { id: string }[];
  if (!parentList.some((e) => e.id === exam8.id)) throw new Error("parent must see Arun 8-A exams");
  if (parentList.some((e) => e.id === exam9.id)) throw new Error("parent must not see 9-B exams");

  const parentGet9 = await authed(parent.accessToken, `/exams/${exam9.id}`);
  if (parentGet9.ok) throw new Error("parent of Arun must not get 9-B exam");

  const students = (await (await authed(admin.accessToken, "/students")).json()) as { id: string; fullName: string }[];
  const mariaId = students.find((s) => s.fullName.startsWith("Maria"))?.id;
  if (!mariaId) throw new Error("Maria missing");

  const parentMaria = await authed(parent.accessToken, `/exams?studentId=${mariaId}`);
  if (parentMaria.ok) throw new Error("parent must not list Maria exams via studentId");

  const parentMariaMarks = await authed(parent.accessToken, `/exams/${exam9.id}/marks?studentId=${mariaId}`);
  if (parentMariaMarks.ok) throw new Error("parent must not read Maria marks via studentId bypass");

  const studentGet9 = await authed(student.accessToken, `/exams/${exam9.id}`);
  if (studentGet9.ok) throw new Error("student 8-A must not get 9-B exam");

  const studentNineList = await authed(student.accessToken, `/exams?sectionId=${nineB.id}`);
  if (studentNineList.ok) throw new Error("student 8-A must not list 9-B exams");

  const studentSelf = (await (await authed(student.accessToken, "/exams")).json()) as { id: string }[];
  if (!studentSelf.some((e) => e.id === exam8.id)) throw new Error("student must list self-section exams");
  if (studentSelf.some((e) => e.id === exam9.id)) throw new Error("student must not list 9-B exams");

  const cross = await authed(teacherB.accessToken, `/exams/${exam8.id}`);
  if (cross.ok) throw new Error("school B must not get school A exam");

  const unauth = await fetch(`${API}/exams`);
  if (unauth.status !== 401) throw new Error("exams list must require auth");

  console.log("PASS: exam create/list/read scope, deny 9-B, parent≠Maria, deny cross-tenant, 401");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
