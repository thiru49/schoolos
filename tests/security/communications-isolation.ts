/**
 * COM-001 Communications domain, RBAC, date validation, publishedAt semantics,
 * academicYearId reconciliation, and multi-tenant isolation tests.
 * Run against running API: pnpm tsx tests/security/communications-isolation.ts
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

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

async function cleanupTestData(schoolIdA: string, schoolIdB: string, prefix: string) {
  // Clean School A test records
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolIdA}, false)`;
  await prisma.notice.deleteMany({
    where: { schoolId: schoolIdA, title: { startsWith: prefix } },
  });
  await prisma.event.deleteMany({
    where: { schoolId: schoolIdA, title: { startsWith: prefix } },
  });
  await prisma.holiday.deleteMany({
    where: { schoolId: schoolIdA, name: { startsWith: prefix } },
  });

  // Clean School B test records
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolIdB}, false)`;
  await prisma.notice.deleteMany({
    where: { schoolId: schoolIdB, title: { startsWith: prefix } },
  });
  await prisma.event.deleteMany({
    where: { schoolId: schoolIdB, title: { startsWith: prefix } },
  });
  await prisma.holiday.deleteMany({
    where: { schoolId: schoolIdB, name: { startsWith: prefix } },
  });
}

async function main() {
  const testPrefix = `TestCOM_${Date.now()}`;

  // Logins
  const adminA = await login("arulneri", "superadmin", "school_super_admin");
  const teacherA = await login("arulneri", "TCH-8A", "teacher");
  const parentA = await login("arulneri", "9000000001", "parent");
  const studentA = await login("arulneri", "AN2021-0001", "student");

  const adminB = await login("school-b", "superadmin", "school_super_admin");
  const teacherB = await login("school-b", "TCH-B", "teacher");

  const schoolA = await prisma.school.findFirst({ where: { slug: "arulneri" } });
  const schoolB = await prisma.school.findFirst({ where: { slug: "school-b" } });
  if (!schoolA || !schoolB) throw new Error("Seed schools missing");

  // Track created entity IDs for verification and cleanup
  const createdNoticeIds: string[] = [];
  const createdEventIds: string[] = [];
  const createdHolidayIds: string[] = [];

  try {
    // 0. Unauthenticated access denial (401)
    const unauthNotices = await fetch(`${API}/notices`);
    if (unauthNotices.status !== 401) {
      throw new Error(`Expected 401 for unauth GET /notices, got ${unauthNotices.status}`);
    }
    const unauthEvents = await fetch(`${API}/events`);
    if (unauthEvents.status !== 401) {
      throw new Error(`Expected 401 for unauth GET /events, got ${unauthEvents.status}`);
    }
    const unauthHolidays = await fetch(`${API}/holidays`);
    if (unauthHolidays.status !== 401) {
      throw new Error(`Expected 401 for unauth GET /holidays, got ${unauthHolidays.status}`);
    }

    // 1. RBAC Write Denial (Teacher, Parent, Student cannot create, update, delete notices, events, holidays)
    for (const [roleName, userToken] of [
      ["teacher", teacherA.accessToken],
      ["parent", parentA.accessToken],
      ["student", studentA.accessToken],
    ] as const) {
      // Notice write denial
      const resNoticePost = await authed(userToken, "/notices", {
        method: "POST",
        body: JSON.stringify({
          title: `${testPrefix}_ForbiddenNotice`,
          body: "Should be denied",
        }),
      });
      if (resNoticePost.status !== 403) {
        throw new Error(`${roleName} POST /notices expected 403, got ${resNoticePost.status}`);
      }

      // Event write denial
      const resEventPost = await authed(userToken, "/events", {
        method: "POST",
        body: JSON.stringify({
          title: `${testPrefix}_ForbiddenEvent`,
          startDate: "2026-10-01T09:00:00Z",
          endDate: "2026-10-01T17:00:00Z",
        }),
      });
      if (resEventPost.status !== 403) {
        throw new Error(`${roleName} POST /events expected 403, got ${resEventPost.status}`);
      }

      // Holiday write denial
      const resHolidayPost = await authed(userToken, "/holidays", {
        method: "POST",
        body: JSON.stringify({
          name: `${testPrefix}_ForbiddenHoliday`,
          date: "2026-12-25",
        }),
      });
      if (resHolidayPost.status !== 403) {
        throw new Error(`${roleName} POST /holidays expected 403, got ${resHolidayPost.status}`);
      }
    }

    // 2. Notice publishedAt Semantics & Draft vs Published Visibility
    // Admin creates draft notice (published: false)
    const draftNoticeRes = await authed(adminA.accessToken, "/notices", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_DraftNotice`,
        body: "Draft notice body",
        published: false,
      }),
    });
    if (!draftNoticeRes.ok) {
      throw new Error(`Admin create draft notice failed: ${draftNoticeRes.status} ${await draftNoticeRes.text()}`);
    }
    const draftNotice = (await draftNoticeRes.json()) as {
      id: string;
      title: string;
      published: boolean;
      publishedAt: string | null;
    };
    createdNoticeIds.push(draftNotice.id);

    // Contract lock: Draft creation must NOT be treated as publication time
    if (draftNotice.publishedAt !== null) {
      throw new Error(`Draft notice must have publishedAt === null, got ${draftNotice.publishedAt}`);
    }

    // Admin creates draft event (published: false)
    const draftEventRes = await authed(adminA.accessToken, "/events", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_DraftEvent`,
        description: "Draft event description",
        startDate: "2026-11-10T10:00:00Z",
        endDate: "2026-11-10T12:00:00Z",
        published: false,
      }),
    });
    if (!draftEventRes.ok) {
      throw new Error(`Admin create draft event failed: ${draftEventRes.status} ${await draftEventRes.text()}`);
    }
    const draftEvent = (await draftEventRes.json()) as { id: string; title: string };
    createdEventIds.push(draftEvent.id);

    // Admin sees draft notice and event
    const adminNoticesList = (await (await authed(adminA.accessToken, "/notices")).json()) as { id: string }[];
    if (!adminNoticesList.some((n) => n.id === draftNotice.id)) {
      throw new Error("Admin must see draft notice");
    }
    const adminEventsList = (await (await authed(adminA.accessToken, "/events")).json()) as { id: string }[];
    if (!adminEventsList.some((e) => e.id === draftEvent.id)) {
      throw new Error("Admin must see draft event");
    }

    // Student, Parent, and Teacher must NOT see draft notice or draft event
    for (const [roleName, userToken] of [
      ["teacher", teacherA.accessToken],
      ["parent", parentA.accessToken],
      ["student", studentA.accessToken],
    ] as const) {
      const userNotices = (await (await authed(userToken, "/notices")).json()) as { id: string }[];
      if (userNotices.some((n) => n.id === draftNotice.id)) {
        throw new Error(`${roleName} must not see draft notice`);
      }

      const userEvents = (await (await authed(userToken, "/events")).json()) as { id: string }[];
      if (userEvents.some((e) => e.id === draftEvent.id)) {
        throw new Error(`${roleName} must not see draft event`);
      }
    }

    // Publish the draft notice: publishing a draft must set publishedAt to the actual publication timestamp
    const publishNoticeRes = await authed(adminA.accessToken, `/notices/${draftNotice.id}`, {
      method: "PATCH",
      body: JSON.stringify({ published: true }),
    });
    if (!publishNoticeRes.ok) {
      throw new Error(`Failed to publish notice: ${publishNoticeRes.status} ${await publishNoticeRes.text()}`);
    }
    const publishedNotice = (await publishNoticeRes.json()) as { published: boolean; publishedAt: string | null };
    if (!publishedNotice.published || !publishedNotice.publishedAt) {
      throw new Error(`Publishing draft must set publishedAt timestamp, got ${publishedNotice.publishedAt}`);
    }

    // Unpublishing notice: unpublishing must reset publishedAt to null
    const unpublishNoticeRes = await authed(adminA.accessToken, `/notices/${draftNotice.id}`, {
      method: "PATCH",
      body: JSON.stringify({ published: false }),
    });
    if (!unpublishNoticeRes.ok) {
      throw new Error(`Failed to unpublish notice: ${unpublishNoticeRes.status} ${await unpublishNoticeRes.text()}`);
    }
    const unpublishedNotice = (await unpublishNoticeRes.json()) as { published: boolean; publishedAt: string | null };
    if (unpublishedNotice.published || unpublishedNotice.publishedAt !== null) {
      throw new Error(`Unpublishing notice must reset publishedAt to null, got ${unpublishedNotice.publishedAt}`);
    }

    // Re-publish the notice
    await authed(adminA.accessToken, `/notices/${draftNotice.id}`, {
      method: "PATCH",
      body: JSON.stringify({ published: true }),
    });

    const publishEventRes = await authed(adminA.accessToken, `/events/${draftEvent.id}`, {
      method: "PATCH",
      body: JSON.stringify({ published: true }),
    });
    if (!publishEventRes.ok) {
      throw new Error(`Failed to publish event: ${publishEventRes.status} ${await publishEventRes.text()}`);
    }

    // Now Student, Parent, and Teacher must see the published event and notice
    for (const [roleName, userToken] of [
      ["teacher", teacherA.accessToken],
      ["parent", parentA.accessToken],
      ["student", studentA.accessToken],
    ] as const) {
      const userNotices = (await (await authed(userToken, "/notices")).json()) as { id: string }[];
      if (!userNotices.some((n) => n.id === draftNotice.id)) {
        throw new Error(`${roleName} must see now-published notice`);
      }

      const userEvents = (await (await authed(userToken, "/events")).json()) as { id: string }[];
      if (!userEvents.some((e) => e.id === draftEvent.id)) {
        throw new Error(`${roleName} must see now-published event`);
      }
    }

    // 3. Notice Audience Filtering for Student / Parent / Teacher
    // Create notice targeted to "student"
    const studentNoticeRes = await authed(adminA.accessToken, "/notices", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_StudentNotice`,
        body: "For students only",
        targetRole: "student",
        published: true,
      }),
    });
    if (!studentNoticeRes.ok) throw new Error("Create student notice failed");
    const studentNotice = (await studentNoticeRes.json()) as { id: string };
    createdNoticeIds.push(studentNotice.id);

    // Create notice targeted to "parent"
    const parentNoticeRes = await authed(adminA.accessToken, "/notices", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_ParentNotice`,
        body: "For parents only",
        targetRole: "parent",
        published: true,
      }),
    });
    if (!parentNoticeRes.ok) throw new Error("Create parent notice failed");
    const parentNotice = (await parentNoticeRes.json()) as { id: string };
    createdNoticeIds.push(parentNotice.id);

    // Create notice targeted to "teacher"
    const teacherNoticeRes = await authed(adminA.accessToken, "/notices", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_TeacherNotice`,
        body: "For teachers only",
        targetRole: "teacher",
        published: true,
      }),
    });
    if (!teacherNoticeRes.ok) throw new Error("Create teacher notice failed");
    const teacherNotice = (await teacherNoticeRes.json()) as { id: string };
    createdNoticeIds.push(teacherNotice.id);

    // Create notice targeted to "all"
    const allNoticeRes = await authed(adminA.accessToken, "/notices", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_AllNotice`,
        body: "For everyone",
        targetRole: "all",
        published: true,
      }),
    });
    if (!allNoticeRes.ok) throw new Error("Create all notice failed");
    const allNotice = (await allNoticeRes.json()) as { id: string };
    createdNoticeIds.push(allNotice.id);

    // Verify Student sees: studentNotice, allNotice; does NOT see: parentNotice, teacherNotice
    const studentList = (await (await authed(studentA.accessToken, "/notices")).json()) as { id: string }[];
    if (!studentList.some((n) => n.id === studentNotice.id)) throw new Error("Student must see student-targeted notice");
    if (!studentList.some((n) => n.id === allNotice.id)) throw new Error("Student must see all-targeted notice");
    if (studentList.some((n) => n.id === parentNotice.id)) throw new Error("Student must not see parent-targeted notice");
    if (studentList.some((n) => n.id === teacherNotice.id)) throw new Error("Student must not see teacher-targeted notice");

    // Verify Parent sees: parentNotice, allNotice; does NOT see: studentNotice, teacherNotice
    const parentList = (await (await authed(parentA.accessToken, "/notices")).json()) as { id: string }[];
    if (!parentList.some((n) => n.id === parentNotice.id)) throw new Error("Parent must see parent-targeted notice");
    if (!parentList.some((n) => n.id === allNotice.id)) throw new Error("Parent must see all-targeted notice");
    if (parentList.some((n) => n.id === studentNotice.id)) throw new Error("Parent must not see student-targeted notice");
    if (parentList.some((n) => n.id === teacherNotice.id)) throw new Error("Parent must not see teacher-targeted notice");

    // Verify Teacher sees: teacherNotice, allNotice; does NOT see: studentNotice, parentNotice
    const teacherList = (await (await authed(teacherA.accessToken, "/notices")).json()) as { id: string }[];
    if (!teacherList.some((n) => n.id === teacherNotice.id)) throw new Error("Teacher must see teacher-targeted notice");
    if (!teacherList.some((n) => n.id === allNotice.id)) throw new Error("Teacher must see all-targeted notice");
    if (teacherList.some((n) => n.id === studentNotice.id)) throw new Error("Teacher must not see student-targeted notice");
    if (teacherList.some((n) => n.id === parentNotice.id)) throw new Error("Teacher must not see parent-targeted notice");

    // Verify Admin sees all 4 notices
    const adminList = (await (await authed(adminA.accessToken, "/notices")).json()) as { id: string }[];
    if (!adminList.some((n) => n.id === studentNotice.id)) throw new Error("Admin must see student notice");
    if (!adminList.some((n) => n.id === parentNotice.id)) throw new Error("Admin must see parent notice");
    if (!adminList.some((n) => n.id === teacherNotice.id)) throw new Error("Admin must see teacher notice");
    if (!adminList.some((n) => n.id === allNotice.id)) throw new Error("Admin must see all notice");

    // 4. Strengthened Event Date Validation
    // Invalid startDate
    const invalidStart = await authed(adminA.accessToken, "/events", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_InvalidStart`,
        startDate: "invalid-date",
        endDate: "2026-10-01T12:00:00Z",
      }),
    });
    if (invalidStart.status !== 400) {
      throw new Error(`Expected 400 for invalid startDate, got ${invalidStart.status}`);
    }

    // Invalid endDate
    const invalidEnd = await authed(adminA.accessToken, "/events", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_InvalidEnd`,
        startDate: "2026-10-01T12:00:00Z",
        endDate: "not-a-date",
      }),
    });
    if (invalidEnd.status !== 400) {
      throw new Error(`Expected 400 for invalid endDate, got ${invalidEnd.status}`);
    }

    // startDate > endDate
    const invertedDates = await authed(adminA.accessToken, "/events", {
      method: "POST",
      body: JSON.stringify({
        title: `${testPrefix}_InvertedDates`,
        startDate: "2026-10-02T12:00:00Z",
        endDate: "2026-10-01T12:00:00Z",
      }),
    });
    if (invertedDates.status !== 400) {
      throw new Error(`Expected 400 for startDate > endDate, got ${invertedDates.status}`);
    }

    // Event update with inverted dates
    const invertedUpdate = await authed(adminA.accessToken, `/events/${draftEvent.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        startDate: "2026-11-12T12:00:00Z", // existing endDate is 2026-11-10T12:00:00Z
      }),
    });
    if (invertedUpdate.status !== 400) {
      throw new Error(`Expected 400 for PATCH event with startDate > endDate, got ${invertedUpdate.status}`);
    }

    // Query parameters validation for GET /events
    const badFromQuery = await authed(adminA.accessToken, "/events?from=bad-date");
    if (badFromQuery.status !== 400) {
      throw new Error(`Expected 400 for invalid from query param, got ${badFromQuery.status}`);
    }

    const badToQuery = await authed(adminA.accessToken, "/events?to=bad-date");
    if (badToQuery.status !== 400) {
      throw new Error(`Expected 400 for invalid to query param, got ${badToQuery.status}`);
    }

    const invertedQuery = await authed(adminA.accessToken, "/events?from=2026-11-10&to=2026-11-01");
    if (invertedQuery.status !== 400) {
      throw new Error(`Expected 400 for from > to query params, got ${invertedQuery.status}`);
    }

    const validQuery = await authed(adminA.accessToken, "/events?from=2026-11-01&to=2026-11-10");
    if (!validQuery.ok) {
      throw new Error(`Expected 200 for valid from/to query params, got ${validQuery.status}`);
    }

    // 5. Holidays: Access, AcademicYearId Reconciliation, and Mutation Permissions
    // Holiday read allowed for Teacher, Parent, Student (via NOTICES_READ)
    for (const [roleName, userToken] of [
      ["teacher", teacherA.accessToken],
      ["parent", parentA.accessToken],
      ["student", studentA.accessToken],
    ] as const) {
      const getHolidaysRes = await authed(userToken, "/holidays");
      if (!getHolidaysRes.ok) {
        throw new Error(`${roleName} GET /holidays failed: ${getHolidaysRes.status} ${await getHolidaysRes.text()}`);
      }
    }

    // Find active academic year for School A
    const activeYearA = await prisma.academicYear.findFirst({
      where: { schoolId: schoolA.id, isActive: true },
    });
    if (!activeYearA) throw new Error("Active academic year missing for School A");

    // Admin creates holiday without academicYearId -> should automatically link active academic year
    const testDate = "2026-08-15";
    const holidayRes = await authed(adminA.accessToken, "/holidays", {
      method: "POST",
      body: JSON.stringify({
        name: `${testPrefix}_IndependenceDay`,
        date: testDate,
      }),
    });
    if (!holidayRes.ok) {
      throw new Error(`Admin create holiday failed: ${holidayRes.status} ${await holidayRes.text()}`);
    }
    const holidayA = (await holidayRes.json()) as {
      id: string;
      name: string;
      date: string;
      academicYearId: string | null;
    };
    createdHolidayIds.push(holidayA.id);

    // Verify academicYearId is reconciled and populated
    if (holidayA.academicYearId !== activeYearA.id) {
      throw new Error(`Holiday academicYearId expected ${activeYearA.id}, got ${holidayA.academicYearId}`);
    }

    // Query holidays filtered by academicYearId
    const holidayFilteredList = (await (
      await authed(adminA.accessToken, `/holidays?academicYearId=${activeYearA.id}`)
    ).json()) as { id: string }[];
    if (!holidayFilteredList.some((h) => h.id === holidayA.id)) {
      throw new Error("Filtered holidays by academicYearId must include created holiday");
    }

    const holidayUnmatchedList = (await (
      await authed(adminA.accessToken, `/holidays?academicYearId=${randomUUID()}`)
    ).json()) as { id: string }[];
    if (holidayUnmatchedList.some((h) => h.id === holidayA.id)) {
      throw new Error("Holidays filtered by foreign academicYearId must not include created holiday");
    }

    // Creating holiday with invalid academicYearId should fail (400)
    const invalidYearHoliday = await authed(adminA.accessToken, "/holidays", {
      method: "POST",
      body: JSON.stringify({
        name: `${testPrefix}_BadYear`,
        date: "2026-08-16",
        academicYearId: randomUUID(),
      }),
    });
    if (invalidYearHoliday.status !== 400) {
      throw new Error(`Expected 400 for non-existent academicYearId, got ${invalidYearHoliday.status}`);
    }

    // Duplicate holiday on same date must be rejected (400)
    const dupHolidayRes = await authed(adminA.accessToken, "/holidays", {
      method: "POST",
      body: JSON.stringify({
        name: `${testPrefix}_DuplicateDate`,
        date: testDate,
      }),
    });
    if (dupHolidayRes.status !== 400) {
      throw new Error(`Duplicate holiday on same date expected 400, got ${dupHolidayRes.status}`);
    }

    // Student, Parent, Teacher cannot DELETE holiday (403)
    for (const [roleName, userToken] of [
      ["teacher", teacherA.accessToken],
      ["parent", parentA.accessToken],
      ["student", studentA.accessToken],
    ] as const) {
      const delRes = await authed(userToken, `/holidays/${holidayA.id}`, { method: "DELETE" });
      if (delRes.status !== 403) {
        throw new Error(`${roleName} DELETE /holidays/:id expected 403, got ${delRes.status}`);
      }
    }

    // 6. Cross-School Read Isolation
    // Admin B / Teacher B query School B notices, events, holidays
    const schoolBNotices = (await (await authed(adminB.accessToken, "/notices")).json()) as { id: string }[];
    for (const id of createdNoticeIds) {
      if (schoolBNotices.some((n) => n.id === id)) {
        throw new Error(`Cross-school read violation: School B listed School A notice ${id}`);
      }
    }

    const schoolBEvents = (await (await authed(adminB.accessToken, "/events")).json()) as { id: string }[];
    for (const id of createdEventIds) {
      if (schoolBEvents.some((e) => e.id === id)) {
        throw new Error(`Cross-school read violation: School B listed School A event ${id}`);
      }
    }

    const schoolBHolidays = (await (await authed(adminB.accessToken, "/holidays")).json()) as { id: string }[];
    if (schoolBHolidays.some((h) => h.id === holidayA.id)) {
      throw new Error(`Cross-school read violation: School B listed School A holiday ${holidayA.id}`);
    }

    const teacherBNotices = (await (await authed(teacherB.accessToken, "/notices")).json()) as { id: string }[];
    for (const id of createdNoticeIds) {
      if (teacherBNotices.some((n) => n.id === id)) {
        throw new Error(`Cross-school read violation: Teacher B listed School A notice ${id}`);
      }
    }

    // 7. Cross-School Mutation Isolation
    // Admin B attempts to mutate or delete School A's notice, event, holiday
    const crossNoticePatch = await authed(adminB.accessToken, `/notices/${draftNotice.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Attacked" }),
    });
    if (crossNoticePatch.status !== 404) {
      throw new Error(`Cross-school PATCH /notices expected 404, got ${crossNoticePatch.status}`);
    }

    const crossNoticeDelete = await authed(adminB.accessToken, `/notices/${draftNotice.id}`, {
      method: "DELETE",
    });
    if (crossNoticeDelete.status !== 404) {
      throw new Error(`Cross-school DELETE /notices expected 404, got ${crossNoticeDelete.status}`);
    }

    const crossEventPatch = await authed(adminB.accessToken, `/events/${draftEvent.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Attacked" }),
    });
    if (crossEventPatch.status !== 404) {
      throw new Error(`Cross-school PATCH /events expected 404, got ${crossEventPatch.status}`);
    }

    const crossEventDelete = await authed(adminB.accessToken, `/events/${draftEvent.id}`, {
      method: "DELETE",
    });
    if (crossEventDelete.status !== 404) {
      throw new Error(`Cross-school DELETE /events expected 404, got ${crossEventDelete.status}`);
    }

    const crossHolidayDelete = await authed(adminB.accessToken, `/holidays/${holidayA.id}`, {
      method: "DELETE",
    });
    if (crossHolidayDelete.status !== 404) {
      throw new Error(`Cross-school DELETE /holidays expected 404, got ${crossHolidayDelete.status}`);
    }

    // School B can create holiday on the same date testDate in its own tenant without collision
    const holidayBRes = await authed(adminB.accessToken, "/holidays", {
      method: "POST",
      body: JSON.stringify({
        name: `${testPrefix}_SchoolBHoliday`,
        date: testDate,
      }),
    });
    if (!holidayBRes.ok) {
      throw new Error(`School B should be able to create holiday on date ${testDate}: ${await holidayBRes.text()}`);
    }
    const holidayB = (await holidayBRes.json()) as { id: string };
    createdHolidayIds.push(holidayB.id);

    console.log(
      "PASS: COM-001 communications RBAC, published/draft filtering, publishedAt semantics, academicYearId reconciliation, date validation, audience targeting, cross-tenant isolation",
    );
  } finally {
    // 8. Deterministic Cleanup
    await cleanupTestData(schoolA.id, schoolB.id, testPrefix);
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FAIL: communications-isolation", e);
  process.exit(1);
});
