/**
 * EXM-004 published-only student/parent read.
 * Run after seed: pnpm tsx tests/security/marks-read-isolation.ts
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
    body: JSON.stringify({ name: `ReadSub-${Date.now()}` }),
  });
  if (!subjectRes.ok) throw new Error("subject failed");
  const subject = (await subjectRes.json()) as { id: string };

  const examRes = await authed(admin.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: eightA.classId,
      sectionId: eightA.id,
      subjectId: subject.id,
      name: `Read 8-A ${Date.now()}`,
      examDate: "2026-09-24",
      maxScore: 100,
    }),
  });
  if (!examRes.ok) throw new Error("create exam failed");
  const exam = (await examRes.json()) as { id: string };

  const exam9Res = await authed(admin.accessToken, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: nineB.classId,
      sectionId: nineB.id,
      subjectId: subject.id,
      name: `Read 9-B ${Date.now()}`,
      examDate: "2026-09-24",
      maxScore: 100,
    }),
  });
  if (!exam9Res.ok) throw new Error("create 9-B exam failed");
  const exam9 = (await exam9Res.json()) as { id: string };

  const students = (await (await authed(admin.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
    label: string;
  }[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  const eightAStudents = students.filter((s) => s.label === "8-A");
  if (!arun || !maria || eightAStudents.length < 2) throw new Error("seed students missing");

  const fill = await authed(teacher.accessToken, `/exams/${exam.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({
      marks: eightAStudents.map((s, i) => ({ studentId: s.id, score: 50 + i })),
    }),
  });
  if (!fill.ok) throw new Error("draft failed " + (await fill.text()));
  const submitted = await authed(teacher.accessToken, `/exams/${exam.id}/marks/submit`, { method: "POST" });
  if (!submitted.ok) throw new Error("submit failed " + (await submitted.text()));

  const studentHidden = (await (await authed(student.accessToken, `/exams/${exam.id}/marks`)).json()) as {
    rows: { studentId: string; status: string | null }[];
  };
  if (studentHidden.rows.some((r) => r.status === "submitted" || r.status === "draft")) {
    throw new Error("unpublished marks leaked to student");
  }

  const parentHidden = (await (await authed(parent.accessToken, `/exams/${exam.id}/marks`)).json()) as {
    rows: { status: string | null }[];
  };
  if (parentHidden.rows.some((r) => r.status === "submitted" || r.status === "draft")) {
    throw new Error("unpublished marks leaked to parent");
  }

  const published = await authed(admin.accessToken, `/exams/${exam.id}/marks/publish`, { method: "POST" });
  if (!published.ok) throw new Error("publish failed");

  const studentLive = (await (await authed(student.accessToken, `/exams/${exam.id}/marks`)).json()) as {
    rows: { studentId: string; status: string | null }[];
  };
  if (studentLive.rows.length !== 1 || studentLive.rows[0]?.studentId !== arun.id) {
    throw new Error("student must see only self published marks");
  }
  if (studentLive.rows[0]?.status !== "published") throw new Error("student row must be published");

  const parentLive = (await (await authed(parent.accessToken, `/exams/${exam.id}/marks`)).json()) as {
    rows: { studentId: string; status: string | null }[];
  };
  if (!parentLive.rows.every((r) => r.studentId === arun.id) || parentLive.rows.length !== 1) {
    throw new Error("parent must see only linked child, not classmates");
  }

  const parentMaria = await authed(parent.accessToken, `/exams/${exam.id}/marks?studentId=${maria.id}`);
  if (parentMaria.ok) throw new Error("parent must not read Maria");

  const parentExam9 = await authed(parent.accessToken, `/exams/${exam9.id}/marks`);
  if (parentExam9.ok) throw new Error("parent of Arun must not read 9-B exam marks");

  const studentExam9 = await authed(student.accessToken, `/exams/${exam9.id}/marks`);
  if (studentExam9.ok) throw new Error("student 8-A must not read 9-B exam marks");

  const cross = await authed(teacherB.accessToken, `/exams/${exam.id}/marks`);
  if (cross.ok) {
    const body = (await cross.json()) as { rows?: { studentId: string }[] };
    if (body.rows && body.rows.length > 0) throw new Error("school B read school A marks");
  }

  const unauth = await fetch(`${API}/exams/${exam.id}/marks`);
  if (unauth.status !== 401) throw new Error("unauthenticated marks read must be 401");

  console.log("PASS: published-only, student self, parent≠Maria, unpublished hidden, deny cross-tenant");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
