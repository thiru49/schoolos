/**
 * REPORT-001 Reports domain, RBAC, tenant isolation, and teacher scoping security tests.
 * Run against running API: pnpm tsx tests/security/reports-isolation.ts
 */
import { PrismaClient } from "@prisma/client";
import { ROLE_CODES } from "@schoolos/permissions";
import bcrypt from "bcryptjs";

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
  console.log("--- Starting REPORT-001 Security & Isolation Tests ---");

  // 1. Unauthenticated checks: Every /reports endpoint must reject unauthenticated requests with 401
  const unauthEndpoints = [
    "/reports/available",
    "/reports/fees/collection",
    "/reports/fees/collection/export",
    "/reports/fees/payments",
    "/reports/fees/payments/export",
    "/reports/students",
    "/reports/students/export",
    "/reports/teachers/workload",
    "/reports/teachers/workload/export",
    "/reports/progress",
    "/reports/progress/export",
    "/reports/attendance",
    "/reports/attendance/export",
  ];

  for (const ep of unauthEndpoints) {
    const res = await fetch(`${API}${ep}`);
    if (res.status !== 401) {
      throw new Error(`Unauthenticated ${ep} expected 401, got ${res.status}`);
    }
  }
  console.log("PASS: All 13 reports endpoints return 401 when unauthenticated");

  // Logins for School A (arulneri)
  const superAdminA = await login("arulneri", "superadmin", "school_super_admin");
  const accountsA = await login("arulneri", "accounts", "accounts_admin");
  const teacherA = await login("arulneri", "TCH-8A", "teacher");
  const parentA = await login("arulneri", "9000000001", "parent");
  const studentA = await login("arulneri", "AN2021-0001", "student");

  // School B logins
  const adminB = await login("school-b", "superadmin", "school_super_admin");
  const teacherB = await login("school-b", "TCH-B", "teacher");

  // Find School A sections 8-A and 9-B
  const sectionsRes = await authed(superAdminA.accessToken, "/academics/sections");
  if (!sectionsRes.ok) throw new Error("Could not load sections: " + (await sectionsRes.text()));
  const sectionsA = (await sectionsRes.json()) as Array<{ id: string; classId: string; label: string }>;
  const sec8A = sectionsA.find((s) => s.label === "8-A");
  const sec9B = sectionsA.find((s) => s.label === "9-B");
  if (!sec8A || !sec9B) throw new Error("Expected sections 8-A and 9-B in arulneri");

  // Create or verify an academic admin user in arulneri
  const schoolA = await prisma.school.findFirstOrThrow({ where: { slug: "arulneri" } });
  const hash = await bcrypt.hash(PASSWORD, 10);
  let academicUser = await prisma.user.findFirst({
    where: { schoolId: schoolA.id, identifier: "academic_admin_test" },
  });
  if (!academicUser) {
    const role = await prisma.role.findFirstOrThrow({
      where: { schoolId: schoolA.id, code: ROLE_CODES.ACADEMIC_ADMIN },
    });
    academicUser = await prisma.user.create({
      data: {
        schoolId: schoolA.id,
        identifier: "academic_admin_test",
        displayName: "Academic Admin Test",
        passwordHash: hash,
      },
    });
    await prisma.userRole.create({
      data: { schoolId: schoolA.id, userId: academicUser.id, roleId: role.id },
    });
    await prisma.userScope.create({
      data: { schoolId: schoolA.id, userId: academicUser.id, scopeType: "school" },
    });
  }
  const academicA = await login("arulneri", "academic_admin_test", "academic_admin");

  // 2. /reports/available behavior
  const superAvailable = await (await authed(superAdminA.accessToken, "/reports/available")).json();
  const superCodes = superAvailable.reports.map((r: { code: string }) => r.code);
  if (
    !superCodes.includes("attendance") ||
    !superCodes.includes("fee_collection") ||
    !superCodes.includes("payments") ||
    !superCodes.includes("students") ||
    !superCodes.includes("teachers") ||
    !superCodes.includes("progress")
  ) {
    throw new Error(`Super Admin must see all 6 report codes, got ${JSON.stringify(superCodes)}`);
  }

  const accountsAvailable = await (await authed(accountsA.accessToken, "/reports/available")).json();
  const accountsCodes = accountsAvailable.reports.map((r: { code: string }) => r.code);
  if (
    !accountsCodes.includes("fee_collection") ||
    !accountsCodes.includes("payments") ||
    accountsCodes.includes("attendance") ||
    accountsCodes.includes("teachers") ||
    accountsCodes.includes("progress")
  ) {
    throw new Error(`Accounts Admin must only see fee reports, got ${JSON.stringify(accountsCodes)}`);
  }

  const academicAvailable = await (await authed(academicA.accessToken, "/reports/available")).json();
  const academicCodes = academicAvailable.reports.map((r: { code: string }) => r.code);
  if (
    !academicCodes.includes("attendance") ||
    !academicCodes.includes("students") ||
    !academicCodes.includes("teachers") ||
    !academicCodes.includes("progress") ||
    academicCodes.includes("fee_collection") ||
    academicCodes.includes("payments")
  ) {
    throw new Error(`Academic Admin must see academic reports and not fee reports, got ${JSON.stringify(academicCodes)}`);
  }

  const teacherAvailable = await (await authed(teacherA.accessToken, "/reports/available")).json();
  const teacherCodes = teacherAvailable.reports.map((r: { code: string }) => r.code);
  if (
    !teacherCodes.includes("attendance") ||
    !teacherCodes.includes("students") ||
    !teacherCodes.includes("progress") ||
    teacherCodes.includes("teachers") || // teacher workload requires school scope!
    teacherCodes.includes("fee_collection")
  ) {
    throw new Error(`Teacher must see attendance/students/progress only without teachers workload or fee reports, got ${JSON.stringify(teacherCodes)}`);
  }
  console.log("PASS: /reports/available strictly reflects permissions and scope rules");

  // 3. Role & Permission Boundaries: Denials
  // Accounts Admin -> Denied on attendance, students, teachers workload, progress
  for (const ep of [
    "/reports/attendance?sectionId=" + sec8A.id + "&from=2026-09-01&to=2026-09-30",
    "/reports/students",
    "/reports/teachers/workload",
    "/reports/progress",
  ]) {
    const res = await authed(accountsA.accessToken, ep);
    if (res.status !== 403) throw new Error(`Accounts Admin expected 403 on ${ep}, got ${res.status}`);
  }

  // Academic Admin -> Denied on fee collection and payments
  for (const ep of ["/reports/fees/collection", "/reports/fees/payments"]) {
    const res = await authed(academicA.accessToken, ep);
    if (res.status !== 403) throw new Error(`Academic Admin expected 403 on ${ep}, got ${res.status}`);
  }

  // Teacher -> Denied on fee collection, payments, and teacher workload (requires school scope)
  for (const ep of ["/reports/fees/collection", "/reports/fees/payments", "/reports/teachers/workload"]) {
    const res = await authed(teacherA.accessToken, ep);
    if (res.status !== 403) throw new Error(`Teacher expected 403 on ${ep}, got ${res.status}`);
  }

  // Parent & Student -> Denied on all reports
  for (const ep of [
    "/reports/fees/collection",
    "/reports/fees/payments",
    "/reports/students",
    "/reports/teachers/workload",
    "/reports/progress",
    "/reports/attendance?sectionId=" + sec8A.id + "&from=2026-09-01&to=2026-09-30",
  ]) {
    const pRes = await authed(parentA.accessToken, ep);
    if (pRes.status !== 403) throw new Error(`Parent expected 403 on ${ep}, got ${pRes.status}`);
    const sRes = await authed(studentA.accessToken, ep);
    if (sRes.status !== 403) throw new Error(`Student expected 403 on ${ep}, got ${sRes.status}`);
  }
  console.log("PASS: Role and permission boundaries properly reject unauthorized roles with 403");

  // 4. Teacher Scope Enforcement in Database & Service Queries (Constraints 7 & 8)
  // Teacher A is assigned to Section 8-A only.
  // When Teacher A requests Section 8-A: Allowed (200)
  const teacherSec8 = await authed(teacherA.accessToken, `/reports/students?sectionId=${sec8A.id}`);
  if (!teacherSec8.ok) throw new Error(`Teacher querying assigned 8-A failed: ${teacherSec8.status} ${await teacherSec8.text()}`);
  const sec8Data = await teacherSec8.json();
  if (!sec8Data.students.every((s: { sectionName: string }) => s.sectionName === "A")) {
    throw new Error("Teacher received students outside section 8-A");
  }

  // When Teacher A requests Section 9-B (unassigned): MUST be 403 Forbidden
  const teacherSec9 = await authed(teacherA.accessToken, `/reports/students?sectionId=${sec9B.id}`);
  if (teacherSec9.status !== 403) {
    throw new Error(`Teacher querying unassigned section 9-B expected 403, got ${teacherSec9.status}`);
  }

  // When Teacher A requests Class 9 (unassigned): MUST be 403 Forbidden
  const teacherClass9 = await authed(teacherA.accessToken, `/reports/students?classId=${sec9B.classId}`);
  if (teacherClass9.status !== 403) {
    throw new Error(`Teacher querying unassigned class 9 expected 403, got ${teacherClass9.status}`);
  }

  // When Teacher A omits sectionId: MUST strictly return ONLY assigned sections, never 9-B or school-wide (Constraint 8)
  const teacherOmitSec = await authed(teacherA.accessToken, `/reports/students`);
  if (!teacherOmitSec.ok) throw new Error(`Teacher omitting sectionId failed: ${teacherOmitSec.status}`);
  const omitData = await teacherOmitSec.json();
  const returnedSections = new Set(omitData.students.map((s: { sectionName: string }) => s.sectionName));
  if (returnedSections.has("B")) {
    throw new Error("CRITICAL LEAK: Teacher omitting sectionId received students from unassigned section 9-B!");
  }
  console.log("PASS: Teacher scope enforced in service/database query; cannot bypass by omitting sectionId");

  // 5. ClassId and SectionId Relationship Validation within Tenant (Constraint 9)
  // Invalid class ID (foreign UUID)
  const fakeClass = "00000000-0000-0000-0000-000000000099";
  const fakeSec = "00000000-0000-0000-0000-000000000088";
  const notFoundClass = await authed(superAdminA.accessToken, `/reports/students?classId=${fakeClass}`);
  if (notFoundClass.status !== 404) {
    throw new Error(`Expected 404 for nonexistent classId, got ${notFoundClass.status}`);
  }

  // Invalid section ID (foreign UUID)
  const notFoundSec = await authed(superAdminA.accessToken, `/reports/students?sectionId=${fakeSec}`);
  if (notFoundSec.status !== 404) {
    throw new Error(`Expected 404 for nonexistent sectionId, got ${notFoundSec.status}`);
  }

  // Mismatched classId and sectionId: section 8-A with class 9
  const mismatched = await authed(
    superAdminA.accessToken,
    `/reports/students?classId=${sec9B.classId}&sectionId=${sec8A.id}`,
  );
  if (mismatched.status !== 400) {
    throw new Error(`Expected 400 for mismatched classId/sectionId, got ${mismatched.status}`);
  }
  console.log("PASS: classId and sectionId existence and relationship within tenant verified (404 and 400)");

  // 6. Cross-Tenant Isolation
  // School B admin trying to query School A section
  const crossTenantSec = await authed(adminB.accessToken, `/reports/students?sectionId=${sec8A.id}`);
  if (crossTenantSec.status !== 404 && crossTenantSec.status !== 403) {
    throw new Error(`School B admin accessing School A section expected 404/403, got ${crossTenantSec.status}`);
  }

  // School B teacher trying to query School A section
  const crossTenantTeacher = await authed(teacherB.accessToken, `/reports/students?sectionId=${sec8A.id}`);
  if (crossTenantTeacher.status !== 404 && crossTenantTeacher.status !== 403) {
    throw new Error(`School B teacher accessing School A section expected 404/403, got ${crossTenantTeacher.status}`);
  }

  // School B fee collection query: must only return School B data, not School A data
  const schoolBFees = await authed(adminB.accessToken, `/reports/fees/collection`);
  if (!schoolBFees.ok) throw new Error("School B fee collection failed");
  const schoolBData = await schoolBFees.json();
  const schoolBStudentNames = schoolBData.rows.map((r: { studentName: string }) => r.studentName);
  if (schoolBStudentNames.some((n: string) => n.includes("Arun Kumar"))) {
    throw new Error("CRITICAL LEAK: School B fee report contained School A student Arun Kumar!");
  }
  console.log("PASS: Cross-tenant isolation verified; School B cannot view or access School A data");

  // 7. Payment Report Inclusive Date Semantics & Payment Method Filter (Constraint 12)
  const paymentRes = await authed(accountsA.accessToken, `/reports/fees/payments?from=2026-01-01&to=2026-12-31`);
  if (!paymentRes.ok) throw new Error("Payment report failed: " + (await paymentRes.text()));
  const paymentData = await paymentRes.json();
  if (typeof paymentData.summary.totalAmount !== "number") {
    throw new Error("Payment report summary totalAmount missing");
  }

  // Test method filter
  const cashPayments = await authed(accountsA.accessToken, `/reports/fees/payments?method=cash`);
  if (!cashPayments.ok) throw new Error("Cash payments report failed");
  const cashData = await cashPayments.json();
  if (!cashData.transactions.every((t: { method: string }) => t.method === "cash")) {
    throw new Error("Method filter failed: non-cash transaction in cash filter");
  }

  // Invalid date range (from > to)
  const invalidDateRange = await authed(
    accountsA.accessToken,
    `/reports/fees/payments?from=2026-12-31&to=2026-01-01`,
  );
  if (invalidDateRange.status !== 400) {
    throw new Error(`Expected 400 for from > to in payment report, got ${invalidDateRange.status}`);
  }
  console.log("PASS: Payment report date semantics, methods, and validation verified");

  // 8. CSV Exporters: Exact Same RBAC & Tenant Rules (Constraint 10)
  const csvEndpoints = [
    { path: "/reports/fees/collection/export", token: accountsA.accessToken, denyToken: academicA.accessToken },
    { path: "/reports/fees/payments/export", token: accountsA.accessToken, denyToken: academicA.accessToken },
    { path: "/reports/students/export", token: academicA.accessToken, denyToken: accountsA.accessToken },
    { path: "/reports/teachers/workload/export", token: academicA.accessToken, denyToken: teacherA.accessToken },
    { path: "/reports/progress/export", token: academicA.accessToken, denyToken: accountsA.accessToken },
    {
      path: `/reports/attendance/export?sectionId=${sec8A.id}&from=2026-09-01&to=2026-09-30`,
      token: academicA.accessToken,
      denyToken: accountsA.accessToken,
    },
  ];

  for (const item of csvEndpoints) {
    // Authorized user
    const okRes = await authed(item.token, item.path);
    if (!okRes.ok) {
      throw new Error(`CSV export ${item.path} failed with status ${okRes.status}: ${await okRes.text()}`);
    }
    const contentType = okRes.headers.get("content-type");
    if (!contentType?.includes("text/csv")) {
      throw new Error(`CSV export ${item.path} expected text/csv header, got ${contentType}`);
    }
    const csvBody = await okRes.text();
    if (!csvBody.includes(",")) {
      throw new Error(`CSV export ${item.path} body does not look like valid CSV`);
    }

    // Unauthorized user must receive 403
    const denyRes = await authed(item.denyToken, item.path);
    if (denyRes.status !== 403) {
      throw new Error(`CSV export ${item.path} expected 403 for unauthorized token, got ${denyRes.status}`);
    }
  }
  console.log("PASS: CSV endpoints execute identical permission and scope checks as JSON endpoints and stream text/csv");

  // 9. Attendance Delegation (Constraint 11)
  const attRes = await authed(
    academicA.accessToken,
    `/reports/attendance?sectionId=${sec8A.id}&from=2026-09-01&to=2026-09-30`,
  );
  if (!attRes.ok) throw new Error("Attendance report delegation failed: " + (await attRes.text()));
  const attData = await attRes.json();
  if (!attData.rows || typeof attData.label !== "string") {
    throw new Error("Attendance report delegation response format invalid");
  }
  console.log("PASS: Attendance report delegated to AttendanceService cleanly");

  console.log("--- ALL REPORT-001 SECURITY TESTS PASSED ---");
}

main()
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
