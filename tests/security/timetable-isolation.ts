/**
 * TT security checks against a running API.
 * Run after seed: pnpm tsx tests/security/timetable-isolation.ts
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
  const maria = await login("arulneri", "AN2021-0901", "student");
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

  const subject = await authed(admin.accessToken, "/subjects", {
    method: "POST",
    body: JSON.stringify({ name: `Math-${Date.now()}` }),
  });
  if (!subject.ok) throw new Error("create subject failed " + (await subject.text()));
  const sub = (await subject.json()) as { id: string };

  const teachers = (await (await authed(admin.accessToken, "/teachers")).json()) as { id: string; employeeId: string }[];
  const tch = teachers.find((t) => t.employeeId === "TCH-8A");
  if (!tch) throw new Error("TCH-8A missing");

  const teacherWrite = await authed(teacher.accessToken, "/timetable", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: sub.id,
      teacherId: tch.id,
      weekday: 1,
      startTime: "09:00",
      endTime: "09:45",
    }),
  });
  if (teacherWrite.ok) throw new Error("teacher must not write timetable");

  const weekday = 7;
  const minute = String(Date.now() % 50).padStart(2, "0");
  const startTime = `16:${minute}`;
  const endMinute = String((Date.now() % 50) + 5).padStart(2, "0");
  const endTime = `16:${endMinute}`;
  const overlapStart = `16:${String((Date.now() % 50) + 2).padStart(2, "0")}`;
  const overlapEnd = `16:${String((Date.now() % 50) + 8).padStart(2, "0")}`;

  const created = await authed(admin.accessToken, "/timetable", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: sub.id,
      teacherId: tch.id,
      weekday,
      startTime,
      endTime,
    }),
  });
  if (!created.ok) throw new Error("admin create period failed " + (await created.text()));
  const period = (await created.json()) as { id: string };

  const overlap = await authed(admin.accessToken, "/timetable", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: sub.id,
      teacherId: tch.id,
      weekday,
      startTime: overlapStart,
      endTime: overlapEnd,
    }),
  });
  if (overlap.ok) throw new Error("overlapping period must be rejected");

  const studentDraft = await authed(student.accessToken, `/timetable?sectionId=${eightA.id}&weekday=${weekday}`);
  const draftRows = studentDraft.ok ? ((await studentDraft.json()) as { id: string }[]) : [];
  if (draftRows.some((r) => r.id === period.id)) throw new Error("student must not see unpublished period");

  const published = await authed(admin.accessToken, "/timetable/publish", {
    method: "POST",
    body: JSON.stringify({ sectionId: eightA.id }),
  });
  if (!published.ok) throw new Error("publish failed " + (await published.text()));

  const studentLive = (await (await authed(student.accessToken, `/timetable?weekday=${weekday}`)).json()) as { id: string }[];
  if (!studentLive.some((r) => r.id === period.id)) throw new Error("student must see published period");

  const children = (await (await authed(parent.accessToken, "/me/children")).json()) as { studentId: string }[];
  const parentLive = (await (
    await authed(parent.accessToken, `/timetable?studentId=${children[0]?.studentId}&weekday=${weekday}`)
  ).json()) as { id: string }[];
  if (!parentLive.some((r) => r.id === period.id)) throw new Error("parent must see child published timetable");

  const teacherNine = await authed(teacher.accessToken, `/timetable?sectionId=${nineB.id}`);
  if (teacherNine.ok) throw new Error("teacher 8-A must not read 9-B timetable");

  const mariaKids = (await (await authed(admin.accessToken, "/students")).json()) as { id: string; fullName: string }[];
  const mariaId = mariaKids.find((s) => s.fullName.startsWith("Maria"))?.id;
  if (mariaId) {
    const parentMaria = await authed(parent.accessToken, `/timetable?studentId=${mariaId}`);
    if (parentMaria.ok) throw new Error("parent of Arun must not read Maria timetable");
  }

  const studentNine = await authed(student.accessToken, `/timetable?sectionId=${nineB.id}`);
  if (studentNine.ok) throw new Error("student 8-A must not read 9-B timetable");

  const cross = await authed(teacherB.accessToken, `/timetable?sectionId=${eightA.id}`);
  if (cross.ok) {
    const body = (await cross.json()) as { subjectName?: string }[];
    if (body.some((p) => p.subjectName)) throw new Error("school B read school A timetable");
  }

  const unauth = await fetch(`${API}/timetable`);
  if (unauth.status !== 401) throw new Error("timetable must require auth");

  console.log("PASS: timetable publish, overlap, teacher/parent/student scope, deny 9-B, deny cross-tenant");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
