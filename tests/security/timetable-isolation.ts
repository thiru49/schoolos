import { PrismaClient } from "@prisma/client";

const API = process.env.API_URL ?? "http://localhost:4000";
const PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

const prisma = new PrismaClient();

async function login(slug: string, identifier: string, roleHint?: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, identifier, password: PASSWORD, roleHint }),
  });
  if (!res.ok) throw new Error(`login ${identifier}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ accessToken: string; user?: { schoolId: string } }>;
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

async function cleanupTestData(
  schoolId: string,
  sectionId: string,
  subjectId?: string,
  periodId?: string,
) {
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolId}, false)`;
  if (periodId) {
    await prisma.timetablePeriod.deleteMany({ where: { id: periodId, schoolId } });
  }
  if (subjectId) {
    await prisma.timetablePeriod.deleteMany({ where: { subjectId, schoolId } });
    await prisma.subject.deleteMany({ where: { id: subjectId, schoolId } });
  }
  // Remove any lingering test periods on weekday 7 for this section
  await prisma.timetablePeriod.deleteMany({ where: { schoolId, sectionId, weekday: 7 } });
  // Clean up any stray test subjects starting with Math-
  const mathSubs = await prisma.subject.findMany({
    where: { schoolId, name: { startsWith: "Math-" } },
  });
  for (const s of mathSubs) {
    await prisma.timetablePeriod.deleteMany({ where: { schoolId, subjectId: s.id } });
    await prisma.subject.deleteMany({ where: { id: s.id, schoolId } });
  }
}

async function main() {
  const teacher = await login("arulneri", "TCH-8A", "teacher");
  const parent = await login("arulneri", "9000000001", "parent");
  const student = await login("arulneri", "AN2021-0001", "student");
  const maria = await login("arulneri", "AN2021-0901", "student");
  const admin = await login("arulneri", "superadmin", "school_super_admin");
  const teacherB = await login("school-b", "TCH-B", "teacher");

  const school = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  if (!school) throw new Error("seed school missing");
  const schoolId = school.id;

  const sections = (await (await authed(admin.accessToken, "/academics/sections")).json()) as {
    id: string;
    classId: string;
    label: string;
  }[];
  const eightA = sections.find((s) => s.label === "8-A");
  const nineB = sections.find((s) => s.label === "9-B");
  if (!eightA || !nineB) throw new Error("seed sections missing");

  // Pre-test cleanup: ensure section 8-A and school are in a pristine, deterministic state
  await cleanupTestData(schoolId, eightA.id);

  let createdSubjectId: string | undefined;
  let createdPeriodId: string | undefined;

  try {
    const subject = await authed(admin.accessToken, "/subjects", {
      method: "POST",
      body: JSON.stringify({ name: `Math-${Date.now()}` }),
    });
    if (!subject.ok) throw new Error("create subject failed " + (await subject.text()));
    const sub = (await subject.json()) as { id: string };
    createdSubjectId = sub.id;

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
    const startTime = "16:00";
    const endTime = "16:30";
    const overlapStart = "16:15";
    const overlapEnd = "16:45";

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
    createdPeriodId = period.id;

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
  } finally {
    // Post-test cleanup: delete created period and subject, clean up weekday 7
    if (createdPeriodId) {
      await authed(admin.accessToken, `/timetable/${createdPeriodId}`, { method: "DELETE" }).catch(() => undefined);
    }
    await cleanupTestData(schoolId, eightA.id, createdSubjectId, createdPeriodId);
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
