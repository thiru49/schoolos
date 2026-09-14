/**
 * MST-002 Academic masters RBAC, validation, scope, and tenant isolation.
 * Run after seed: pnpm tsx tests/security/academics-isolation.ts
 */
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
  if (!res.ok) throw new Error(`login ${identifier}@${slug}: ${res.status} ${await res.text()}`);
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
  const suffix = Date.now();
  const adminA = await login("arulneri", "superadmin", "school_super_admin");
  const teacherA = await login("arulneri", "TCH-8A", "teacher");
  const parentA = await login("arulneri", "9000000001", "parent");
  const adminB = await login("school-b", "superadmin", "school_super_admin");

  const schoolA = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  const schoolB = await prisma.school.findFirst({ where: { slug: "school-b" } });
  if (!schoolA || !schoolB) throw new Error("Seed schools missing");

  const createdYearIds: string[] = [];
  const createdClassIds: string[] = [];
  const createdSectionIds: string[] = [];
  const createdSubjectIds: string[] = [];

  try {
    const unauth = await fetch(`${API}/academics/years`);
    if (unauth.status !== 401) {
      throw new Error(`unauthenticated GET /academics/years expected 401, got ${unauth.status}`);
    }

    for (const [role, token] of [
      ["teacher", teacherA.accessToken],
      ["parent", parentA.accessToken],
    ] as const) {
      const res = await authed(token, "/academics/classes", { method: "POST", body: JSON.stringify({ name: "X", academicYearId: "00000000-0000-0000-0000-000000000000" }) });
      if (res.status !== 403) {
        throw new Error(`${role} POST /academics/classes expected 403, got ${res.status}`);
      }
    }

    const invalidYear = await authed(adminA.accessToken, "/academics/years", {
      method: "POST",
      body: JSON.stringify({ name: "  " }),
    });
    if (invalidYear.status !== 400) {
      throw new Error(`invalid academic year expected 400, got ${invalidYear.status}`);
    }

    const yearName = `AY-${suffix}`;
    const createdYear = await authed(adminA.accessToken, "/academics/years", {
      method: "POST",
      body: JSON.stringify({ name: yearName, isActive: false }),
    });
    if (!createdYear.ok) throw new Error("create year failed " + (await createdYear.text()));
    const year = (await createdYear.json()) as { id: string; name: string };
    createdYearIds.push(year.id);
    if (year.name !== yearName) throw new Error("year name not trimmed");

    const yearsA = (await (await authed(adminA.accessToken, "/academics/years")).json()) as { name: string }[];
    if (!yearsA.some((y) => y.name === yearName)) throw new Error("admin missing created year");

    const yearsB = (await (await authed(adminB.accessToken, "/academics/years")).json()) as { name: string }[];
    if (yearsB.some((y) => y.name === yearName)) throw new Error("school-b listed Arul Neri academic year");

    const className = `Cls-${suffix}`;
    const createdClass = await authed(adminA.accessToken, "/academics/classes", {
      method: "POST",
      body: JSON.stringify({ academicYearId: year.id, name: className }),
    });
    if (!createdClass.ok) throw new Error("create class failed " + (await createdClass.text()));
    const cls = (await createdClass.json()) as { id: string; name: string };
    createdClassIds.push(cls.id);

    const sectionName = `Sec-${suffix}`;
    const createdSection = await authed(adminA.accessToken, "/academics/sections", {
      method: "POST",
      body: JSON.stringify({ classId: cls.id, name: sectionName }),
    });
    if (!createdSection.ok) throw new Error("create section failed " + (await createdSection.text()));
    const section = (await createdSection.json()) as { id: string; name: string };
    createdSectionIds.push(section.id);

    const subjectName = `Subj-${suffix}`;
    const createdSubject = await authed(adminA.accessToken, "/academics/subjects", {
      method: "POST",
      body: JSON.stringify({ name: subjectName }),
    });
    if (!createdSubject.ok) throw new Error("create subject failed " + (await createdSubject.text()));
    const subject = (await createdSubject.json()) as { id: string; name: string };
    createdSubjectIds.push(subject.id);

    const dupSubject = await authed(adminA.accessToken, "/academics/subjects", {
      method: "POST",
      body: JSON.stringify({ name: subjectName }),
    });
    if (dupSubject.status !== 409) {
      throw new Error(`duplicate subject expected 409, got ${dupSubject.status}`);
    }

    const classesBRes = await authed(adminB.accessToken, `/academics/classes?academicYearId=${year.id}`);
    if (classesBRes.status === 200) {
      const classesB = (await classesBRes.json()) as { id: string }[];
      if (classesB.some((c) => c.id === cls.id)) {
        throw new Error("school-b could read school A class by foreign academicYearId");
      }
    } else if (classesBRes.status !== 404) {
      throw new Error(`cross-tenant class list expected 404, got ${classesBRes.status}`);
    }

    const stealClass = await authed(adminB.accessToken, "/academics/classes", {
      method: "POST",
      body: JSON.stringify({ academicYearId: year.id, name: `Steal-${suffix}` }),
    });
    if (stealClass.status !== 400 && stealClass.status !== 404) {
      throw new Error(`cross-tenant class create expected 400/404, got ${stealClass.status}`);
    }

    await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolA.id}, false)`;
    const auditCount = await prisma.auditLog.count({
      where: {
        schoolId: schoolA.id,
        resource: { in: ["academic_year", "class", "section", "subject"] },
        resourceId: { in: [...createdYearIds, ...createdClassIds, ...createdSectionIds, ...createdSubjectIds] },
      },
    });
    if (auditCount < 4) {
      throw new Error(`expected audit logs for academic writes, found ${auditCount}`);
    }

    console.log("PASS: MST-002 academics RBAC, validation, audit, tenant isolation");
  } finally {
    await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolA.id}, false)`;
    if (createdSectionIds.length) {
      await prisma.section.deleteMany({ where: { id: { in: createdSectionIds }, schoolId: schoolA.id } });
    }
    if (createdClassIds.length) {
      await prisma.class.deleteMany({ where: { id: { in: createdClassIds }, schoolId: schoolA.id } });
    }
    if (createdYearIds.length) {
      await prisma.academicYear.deleteMany({ where: { id: { in: createdYearIds }, schoolId: schoolA.id } });
    }
    if (createdSubjectIds.length) {
      await prisma.subject.deleteMany({ where: { id: { in: createdSubjectIds }, schoolId: schoolA.id } });
    }
  }
}

main().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});
