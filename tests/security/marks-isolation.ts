/**
 * EXM-002 security checks against a running API.
 * Run after seed: pnpm tsx tests/security/marks-isolation.ts
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

async function createExam(
  token: string,
  section: { id: string; classId: string },
  subjectId: string,
  name: string,
) {
  const res = await authed(token, "/exams", {
    method: "POST",
    body: JSON.stringify({
      classId: section.classId,
      sectionId: section.id,
      subjectId,
      name,
      examDate: "2026-09-22",
      maxScore: 100,
    }),
  });
  if (!res.ok) throw new Error("create exam failed " + (await res.text()));
  return res.json() as Promise<{ id: string }>;
}

async function main() {
  const teacher = await login("arulneri", "TCH-8A", "teacher");
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
    body: JSON.stringify({ name: `MarksSub-${Date.now()}` }),
  });
  if (!subjectRes.ok) throw new Error("subject failed");
  const subject = (await subjectRes.json()) as { id: string };

  const exam8 = await createExam(admin.accessToken, eightA, subject.id, `Draft 8-A ${Date.now()}`);
  const exam9 = await createExam(admin.accessToken, nineB, subject.id, `Draft 9-B ${Date.now()}`);

  const students = (await (await authed(admin.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
    sectionId?: string;
    label: string;
  }[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const maria = students.find((s) => s.fullName.startsWith("Maria"));
  const eightAStudents = students.filter((s) => s.label === "8-A");
  if (!arun || !maria) throw new Error("seed students missing");

  const draftOk = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 80 }] }),
  });
  if (!draftOk.ok) throw new Error("teacher 8-A draft failed " + (await draftOk.text()));

  const draft9 = await authed(teacher.accessToken, `/exams/${exam9.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: maria.id, score: 70 }] }),
  });
  if (draft9.ok) throw new Error("teacher 8-A must not draft 9-B");

  const outside = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: maria.id, score: 70 }] }),
  });
  if (outside.ok) throw new Error("student outside section must be rejected");

  const tooHigh = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 101 }] }),
  });
  if (tooHigh.ok) throw new Error("score above maxScore must be rejected");

  const roster = eightAStudents.length ? eightAStudents : [arun];
  const allDrafts = roster.map((s) => ({ studentId: s.id, score: 50 }));
  const fill = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: allDrafts }),
  });
  if (!fill.ok) throw new Error("fill drafts failed " + (await fill.text()));

  const submitted = await authed(admin.accessToken, `/exams/${exam8.id}/marks/submit`, { method: "POST" });
  if (!submitted.ok) throw new Error("submit fixture failed " + (await submitted.text()));

  const afterSubmit = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 90 }] }),
  });
  if (afterSubmit.ok) throw new Error("submitted marks cannot be edited");

  const examPub = await createExam(admin.accessToken, eightA, subject.id, `Pub 8-A ${Date.now()}`);
  const fillPub = await authed(teacher.accessToken, `/exams/${examPub.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: allDrafts }),
  });
  if (!fillPub.ok) throw new Error("fill publish exam failed " + (await fillPub.text()));
  const subPub = await authed(admin.accessToken, `/exams/${examPub.id}/marks/submit`, { method: "POST" });
  if (!subPub.ok) throw new Error("submit publish exam failed " + (await subPub.text()));
  const pub = await authed(admin.accessToken, `/exams/${examPub.id}/marks/publish`, { method: "POST" });
  if (!pub.ok) throw new Error("publish fixture failed " + (await pub.text()));
  const afterPub = await authed(teacher.accessToken, `/exams/${examPub.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 10 }] }),
  });
  if (afterPub.ok) throw new Error("published marks cannot be edited");

  const cross = await authed(teacherB.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 1 }] }),
  });
  if (cross.ok) throw new Error("school B must not draft school A marks");

  const studentWrite = await authed(student.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 1 }] }),
  });
  if (studentWrite.ok) throw new Error("student must not draft marks");

  const unauth = await fetch(`${API}/exams/${exam8.id}/marks`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 1 }] }),
  });
  if (unauth.status !== 401) throw new Error("unauthenticated marks write must be 401");

  console.log("PASS: marks draft scope, outside section, submitted/published locked, deny cross-tenant, 401");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
