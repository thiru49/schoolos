/**
 * DB tenancy checks: RLS from migrations, public branding projection, composite FKs.
 * Run against a migrated database (seed optional).
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const policies = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_policies WHERE policyname = 'tenant_isolation'
  `;
  const tables = new Set(policies.map((p) => p.tablename));
  const required = [
    "schools",
    "users",
    "students",
    "classes",
    "sections",
    "attendance",
    "user_roles",
    "user_scopes",
    "fee_heads",
    "fee_payments",
    "receipts",
  ];
  for (const t of required) {
    if (!tables.has(t)) throw new Error(`RLS policy missing on ${t} — was migrate applied?`);
  }

  const rls = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'students'
  `;
  if (!rls[0]?.relrowsecurity || !rls[0]?.relforcerowsecurity) {
    throw new Error("students RLS/FORCE RLS not enabled");
  }

  for (const feeTable of ["fee_heads", "fee_payments", "receipts"] as const) {
    const feeRls = await prisma.$queryRaw<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
      SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = ${feeTable}
    `;
    if (!feeRls[0]?.relrowsecurity || !feeRls[0]?.relforcerowsecurity) {
      throw new Error(`${feeTable} RLS/FORCE RLS not enabled`);
    }
  }

  const fn = await prisma.$queryRaw<{ proname: string }[]>`
    SELECT p.proname FROM pg_proc p WHERE p.proname = 'get_public_branding'
  `;
  if (!fn[0]) throw new Error("get_public_branding missing");
  const old = await prisma.$queryRaw<{ proname: string }[]>`
    SELECT p.proname FROM pg_proc p WHERE p.proname = 'get_school_by_slug'
  `;
  if (old[0]) throw new Error("get_school_by_slug must be dropped");

  const grants = await prisma.$queryRaw<{ grantee: string }[]>`
    SELECT grantee FROM information_schema.routine_privileges
    WHERE routine_name = 'get_public_branding' AND privilege_type = 'EXECUTE'
  `;
  if (grants.some((g) => g.grantee === "PUBLIC")) {
    throw new Error("get_public_branding must not GRANT EXECUTE TO PUBLIC");
  }

  const schoolA = randomUUID();
  const schoolB = randomUUID();
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolA}, false)`;
  await prisma.$executeRaw`
    INSERT INTO schools (id, slug, name, tagline, location, powered_by, receipt_prefix, theme, typography, updated_at)
    VALUES (
      ${schoolA}::uuid, ${"integrity-a-" + schoolA.slice(0, 8)}, 'A', 't', 'x', 'p', 'A/1',
      '{}'::jsonb, '{}'::jsonb, NOW()
    )
  `;
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolB}, false)`;
  await prisma.$executeRaw`
    INSERT INTO schools (id, slug, name, tagline, location, powered_by, receipt_prefix, theme, typography, updated_at)
    VALUES (
      ${schoolB}::uuid, ${"integrity-b-" + schoolB.slice(0, 8)}, 'B', 't', 'x', 'p', 'B/1',
      '{}'::jsonb, '{}'::jsonb, NOW()
    )
  `;

  const yearB = randomUUID();
  const classB = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO academic_years (id, school_id, name, is_active)
    VALUES (${yearB}::uuid, ${schoolB}::uuid, '2026-27', true)
  `;
  await prisma.$executeRaw`
    INSERT INTO classes (id, school_id, academic_year_id, name)
    VALUES (${classB}::uuid, ${schoolB}::uuid, ${yearB}::uuid, '8')
  `;

  const userA = randomUUID();
  const sectionA = randomUUID();
  const yearA = randomUUID();
  const classA = randomUUID();
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolA}, false)`;
  await prisma.$executeRaw`
    INSERT INTO academic_years (id, school_id, name, is_active)
    VALUES (${yearA}::uuid, ${schoolA}::uuid, '2026-27', true)
  `;
  await prisma.$executeRaw`
    INSERT INTO classes (id, school_id, academic_year_id, name)
    VALUES (${classA}::uuid, ${schoolA}::uuid, ${yearA}::uuid, '8')
  `;
  await prisma.$executeRaw`
    INSERT INTO sections (id, school_id, class_id, name)
    VALUES (${sectionA}::uuid, ${schoolA}::uuid, ${classA}::uuid, 'A')
  `;
  await prisma.$executeRaw`
    INSERT INTO users (id, school_id, identifier, password_hash, display_name, updated_at)
    VALUES (${userA}::uuid, ${schoolA}::uuid, 'x', 'x', 'x', NOW())
  `;

  let fkBlocked = false;
  try {
    await prisma.$executeRaw`
      INSERT INTO students (id, school_id, user_id, admission_number, full_name, class_id, section_id)
      VALUES (
        ${randomUUID()}::uuid, ${schoolA}::uuid, ${userA}::uuid, 'X-1', 'Bad',
        ${classB}::uuid, ${sectionA}::uuid
      )
    `;
  } catch {
    fkBlocked = true;
  }
  if (!fkBlocked) throw new Error("student from school A accepted class from school B");

  const roleB = randomUUID();
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolB}, false)`;
  await prisma.$executeRaw`
    INSERT INTO roles (id, school_id, code, name, is_system)
    VALUES (${roleB}::uuid, ${schoolB}::uuid, 'teacher', 'Teacher', true)
  `;
  let roleBlocked = false;
  try {
    await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolA}, false)`;
    await prisma.$executeRaw`
      INSERT INTO user_roles (user_id, role_id, school_id)
      VALUES (${userA}::uuid, ${roleB}::uuid, ${schoolA}::uuid)
    `;
  } catch {
    roleBlocked = true;
  }
  if (!roleBlocked) throw new Error("school A user accepted school B role");

  let scopeBlocked = false;
  try {
    await prisma.$executeRaw`
      INSERT INTO user_scopes (id, school_id, user_id, scope_type, class_id)
      VALUES (${randomUUID()}::uuid, ${schoolA}::uuid, ${userA}::uuid, 'class', ${classB}::uuid)
    `;
  } catch {
    scopeBlocked = true;
  }
  if (!scopeBlocked) throw new Error("user_scope accepted class from another school");

  const studentA = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO students (id, school_id, user_id, admission_number, full_name, class_id, section_id)
    VALUES (
      ${studentA}::uuid, ${schoolA}::uuid, ${userA}::uuid, 'X-OK', 'Ok',
      ${classA}::uuid, ${sectionA}::uuid
    )
  `;
  let statusBlocked = false;
  try {
    await prisma.$executeRaw`
      INSERT INTO attendance (id, school_id, student_id, section_id, date, status, marked_by_user_id)
      VALUES (
        ${randomUUID()}::uuid, ${schoolA}::uuid, ${studentA}::uuid, ${sectionA}::uuid,
        DATE '2026-09-12', 'X', ${userA}::uuid
      )
    `;
  } catch {
    statusBlocked = true;
  }
  if (!statusBlocked) throw new Error("attendance accepted status outside P/A/L/H");

  console.log("PASS: RLS in migrations, branding projection, composite tenant FK, checks");
}

main()
  .catch((e) => {
    console.error("FAIL", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
