/**
 * EXM-003 submit/publish checks against a running API.
 * Run after seed: pnpm tsx tests/security/marks-publish-isolation.ts
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
      examDate: "2026-09-23",
      maxScore: 100,
    }),
  });
  if (!res.ok) throw new Error("create exam failed " + (await res.text()));
  return res.json() as Promise<{ id: string }>;
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
    body: JSON.stringify({ name: `PubSub-${Date.now()}` }),
  });
  if (!subjectRes.ok) throw new Error("subject failed");
  const subject = (await subjectRes.json()) as { id: string };

  const exam8 = await createExam(admin.accessToken, eightA, subject.id, `Submit 8-A ${Date.now()}`);
  const exam9 = await createExam(admin.accessToken, nineB, subject.id, `Submit 9-B ${Date.now()}`);

  const students = (await (await authed(admin.accessToken, "/students")).json()) as {
    id: string;
    fullName: string;
    label: string;
  }[];
  const arun = students.find((s) => s.fullName.startsWith("Arun"));
  const eightAStudents = students.filter((s) => s.label === "8-A");
  if (!arun || eightAStudents.length === 0) throw new Error("8-A students missing");

  const incomplete = await authed(teacher.accessToken, `/exams/${exam8.id}/marks/submit`, { method: "POST" });
  if (incomplete.ok) throw new Error("incomplete marks must not submit");

  const one = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 60 }] }),
  });
  if (!one.ok) throw new Error("partial draft failed");
  const stillIncomplete = await authed(teacher.accessToken, `/exams/${exam8.id}/marks/submit`, { method: "POST" });
  if (stillIncomplete.ok) throw new Error("partial roster must not submit");

  const fill = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: eightAStudents.map((s) => ({ studentId: s.id, score: 75 })) }),
  });
  if (!fill.ok) throw new Error("fill drafts failed " + (await fill.text()));

  const submit9 = await authed(teacher.accessToken, `/exams/${exam9.id}/marks/submit`, { method: "POST" });
  if (submit9.ok) throw new Error("teacher 8-A must not submit 9-B");

  const submitted = await authed(teacher.accessToken, `/exams/${exam8.id}/marks/submit`, { method: "POST" });
  if (!submitted.ok) throw new Error("teacher submit 8-A failed " + (await submitted.text()));

  const editAfter = await authed(teacher.accessToken, `/exams/${exam8.id}/marks`, {
    method: "PUT",
    body: JSON.stringify({ marks: [{ studentId: arun.id, score: 99 }] }),
  });
  if (editAfter.ok) throw new Error("submitted marks cannot be edited");

  const teacherPublish = await authed(teacher.accessToken, `/exams/${exam8.id}/marks/publish`, { method: "POST" });
  if (teacherPublish.ok) throw new Error("teacher must not publish");

  const teacherQueue = await authed(teacher.accessToken, "/exams/queue");
  if (teacherQueue.ok) throw new Error("teacher must not read publish queue");

  const studentHidden = await authed(student.accessToken, `/exams/${exam8.id}/marks`);
  if (!studentHidden.ok) throw new Error("student should read published-only marks endpoint");
  const hiddenRows = (await studentHidden.json()) as { rows: { status: string | null; score: number | null }[] };
  if (hiddenRows.rows.some((r) => r.status === "submitted" || r.status === "draft")) {
    throw new Error("student must not see submitted-but-unpublished marks");
  }

  const parentKids = (await (await authed(parent.accessToken, "/me/children")).json()) as { studentId: string }[];
  const parentHidden = await authed(
    parent.accessToken,
    `/exams/${exam8.id}/marks?studentId=${parentKids[0]?.studentId}`,
  );
  if (parentHidden.ok) {
    const body = (await parentHidden.json()) as { rows: { status: string | null }[] };
    if (body.rows.some((r) => r.status === "submitted" || r.status === "draft")) {
      throw new Error("parent must not see submitted-but-unpublished marks");
    }
  }

  const queue = await authed(admin.accessToken, "/exams/queue");
  if (!queue.ok) throw new Error("admin queue failed " + (await queue.text()));
  const queued = (await queue.json()) as { id: string }[];
  if (!queued.some((e) => e.id === exam8.id)) throw new Error("submitted exam missing from queue");

  const published = await authed(admin.accessToken, `/exams/${exam8.id}/marks/publish`, { method: "POST" });
  if (!published.ok) throw new Error("admin publish failed " + (await published.text()));

  const studentLive = (await (await authed(student.accessToken, `/exams/${exam8.id}/marks`)).json()) as {
    rows: { status: string | null; score: number | null }[];
  };
  if (!studentLive.rows.some((r) => r.status === "published" && r.score === 75)) {
    throw new Error("published marks must be visible to student");
  }

  const parentLive = (await (
    await authed(parent.accessToken, `/exams/${exam8.id}/marks?studentId=${parentKids[0]?.studentId}`)
  ).json()) as { rows: { status: string | null; score: number | null }[] };
  if (!parentLive.rows.some((r) => r.status === "published")) {
    throw new Error("published marks must be visible to parent");
  }

  const crossSubmit = await authed(teacherB.accessToken, `/exams/${exam8.id}/marks/submit`, { method: "POST" });
  if (crossSubmit.ok) throw new Error("school B must not submit school A");
  const crossPublish = await authed(teacherB.accessToken, `/exams/${exam8.id}/marks/publish`, { method: "POST" });
  if (crossPublish.ok) throw new Error("school B must not publish school A");

  const unauthSubmit = await fetch(`${API}/exams/${exam8.id}/marks/submit`, { method: "POST" });
  if (unauthSubmit.status !== 401) throw new Error("unauthenticated submit must be 401");
  const unauthPublish = await fetch(`${API}/exams/${exam8.id}/marks/publish`, { method: "POST" });
  if (unauthPublish.status !== 401) throw new Error("unauthenticated publish must be 401");

  console.log("PASS: submit complete-only, hide unpublished, publish visible, deny 9-B/teacher publish/cross-tenant/401");
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
