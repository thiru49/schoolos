/**
 * EXM-005 report-card JSON access.
 * Run after seed: pnpm tsx tests/security/report-card-isolation.ts
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
  if (!eightA) throw new Error("8-A missing");

  const subjectRes = await authed(admin.accessToken, "/subjects", {
    method: "POST",
    body: JSON.stringify({ name: `RC-${Date.now()}` }),
  });
  const subject = (await subjectRes.json()) as { id: string };

  const examName = `RC Exam ${Date.now()}`;
  const examRes = await authed(admin.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: subject.id,
      name: examName,
      examDate: "2026-09-25",
      maxScore: 100,
    }),
  });
  if (!examRes.ok) throw new Error("exam create failed " + (await examRes.text()));
  const exam = (await examRes.json()) as { id: string };

  const students = (await (await authed(admin.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
    label: string;
  }[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  const eightAStudents = students.filter((s) => s.label === "8-A");
  if (!arun || !maria) throw new Error("students missing");

  await authed(teacher.accessToken, `/exams/${exam.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: eightAStudents.map((s) => ({ studentId: s.id, score: 88 })) }),
  });
  const submitted = await authed(teacher.accessToken, `/exams/${exam.id}/marks/submit`, { method: "POST" });
  if (!submitted.ok) throw new Error("submit failed " + (await submitted.text()));

  const beforePub = await authed(student.accessToken, `/exams/report-card`);
  if (!beforePub.ok) throw new Error("student report-card GET failed " + (await beforePub.text()));
  const beforeBody = (await beforePub.json()) as { rows: { exam: string; score: number }[] };
  if (beforeBody.rows.some((r) => r.exam === examName && r.score === 88)) {
    throw new Error("unpublished marks appeared on report card");
  }

  const pub = await authed(admin.accessToken, `/exams/${exam.id}/marks/publish`, { method: "POST" });
  if (!pub.ok) throw new Error("publish failed");

  const studentCard = (await (await authed(student.accessToken, `/exams/report-card`)).json()) as {
    studentName: string;
    classSection: string;
    schoolName: string;
    rows: { exam: string; score: number; maxScore: number }[];
  };
  if (!studentCard.studentName.startsWith("Arun")) throw new Error("student card must be self");
  if (!studentCard.rows.some((r) => r.score === 88 && r.maxScore === 100)) {
    throw new Error("published score missing from student card");
  }

  const parentCard = (await (await authed(parent.accessToken, `/exams/report-card?studentId=${arun.id}`)).json()) as {
    studentName: string;
    rows: { score: number }[];
  };
  if (!parentCard.studentName.startsWith("Arun")) throw new Error("parent must see linked child");
  if (!parentCard.rows.some((r) => r.score === 88)) throw new Error("parent missing published score");

  const parentMaria = await authed(parent.accessToken, `/exams/report-card?studentId=${maria.id}`);
  if (parentMaria.ok) throw new Error("parent must not access Maria");

  const classmate = eightAStudents.find((s) => s.id !== arun.id);
  if (classmate) {
    const studentOther = await authed(student.accessToken, `/exams/report-card?studentId=${classmate.id}`);
    if (studentOther.ok) throw new Error("student must not read classmate report card");
  }

  const teacherMaria = await authed(teacher.accessToken, `/exams/report-card?studentId=${maria.id}`);
  if (teacherMaria.ok) throw new Error("teacher 8-A must not read Maria report card");

  const cross = await authed(teacherB.accessToken, `/exams/report-card?studentId=${arun.id}`);
  if (cross.ok) throw new Error("school B must not read school A report card");

  const unauth = await fetch(`${API}/exams/report-card?studentId=${arun.id}`);
  if (unauth.status !== 401) throw new Error("unauthenticated report-card must be 401");

  console.log("PASS: report-card published-only, self/child scope, deny Maria, deny cross-tenant, 401");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
