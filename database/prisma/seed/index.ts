import { ALL_PERMISSION_CODES, ROLE_CODES } from "@schoolos/permissions";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { arulNeriTheme, arulNeriTypography, schoolBTheme } from "./branding";
import { ROLE_NAMES, ROLE_PERMISSION_MATRIX } from "./matrix";

const prisma = new PrismaClient();

async function setSchool(schoolId: string) {
  await prisma.$executeRaw`SELECT set_config('app.school_id', ${schoolId}, false)`;
}

const TENANT_TABLES = [
  "schools",
  "users",
  "roles",
  "academic_years",
  "classes",
  "sections",
  "students",
  "parents",
  "parent_students",
  "teachers",
  "attendance",
  "audit_logs",
  "refresh_tokens",
] as const;

async function enableRls() {
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION get_school_by_slug(p_slug text)
    RETURNS SETOF schools
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $$ SELECT * FROM schools WHERE slug = p_slug; $$;
  `);

  for (const table of TENANT_TABLES) {
    const col = table === "schools" ? "id" : "school_id";
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await prisma.$executeRawUnsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS tenant_isolation ON ${table}`);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY tenant_isolation ON ${table}
      USING (${col} = NULLIF(current_setting('app.school_id', true), '')::uuid)
      WITH CHECK (${col} = NULLIF(current_setting('app.school_id', true), '')::uuid)
    `);
  }
}

async function seedPermissions() {
  for (const code of ALL_PERMISSION_CODES) {
    const [resource, action] = code.split(".");
    await prisma.permission.upsert({
      where: { code },
      update: { resource, action, description: code },
      create: { code, resource, action, description: code },
    });
  }
}

async function seedRolesForSchool(schoolId: string) {
  const permissions = await prisma.permission.findMany();
  const byCode = new Map(permissions.map((p) => [p.code, p.id]));

  for (const [code, permCodes] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const role = await prisma.role.upsert({
      where: { schoolId_code: { schoolId, code } },
      update: { name: ROLE_NAMES[code as keyof typeof ROLE_NAMES] },
      create: {
        schoolId,
        code,
        name: ROLE_NAMES[code as keyof typeof ROLE_NAMES],
        isSystem: true,
      },
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permCodes.map((c) => {
        const permissionId = byCode.get(c);
        if (!permissionId) throw new Error(`Missing permission ${c}`);
        return { roleId: role.id, permissionId };
      }),
    });
  }
}

async function createUser(opts: {
  schoolId: string;
  identifier: string;
  displayName: string;
  passwordHash: string;
  roleCode: string;
}) {
  const user = await prisma.user.create({
    data: {
      schoolId: opts.schoolId,
      identifier: opts.identifier,
      displayName: opts.displayName,
      passwordHash: opts.passwordHash,
    },
  });
  const role = await prisma.role.findUniqueOrThrow({
    where: { schoolId_code: { schoolId: opts.schoolId, code: opts.roleCode } },
  });
  await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  return user;
}

async function seedArulNeri(passwordHash: string) {
  const schoolId = randomUUID();
  await setSchool(schoolId);
  await prisma.school.create({
    data: {
      id: schoolId,
      slug: "arulneri",
      name: "Arul Neri Academy",
      tagline: "Learning · Care · Excellence",
      location: "Tirunelveli · Madurai · Thoothukudi",
      poweredBy: "CREOVY Digital Solutions",
      receiptPrefix: "ANA/26-27",
      defaultLanguage: "en",
      attendanceMode: "daily",
      theme: arulNeriTheme,
      typography: arulNeriTypography,
    },
  });

  await seedRolesForSchool(schoolId);

  const year = await prisma.academicYear.create({
    data: { schoolId, name: "2026-27", isActive: true },
  });
  const class8 = await prisma.class.create({
    data: { schoolId, academicYearId: year.id, name: "8" },
  });
  const class9 = await prisma.class.create({
    data: { schoolId, academicYearId: year.id, name: "9" },
  });
  const section8A = await prisma.section.create({
    data: { schoolId, classId: class8.id, name: "A" },
  });
  const section9B = await prisma.section.create({
    data: { schoolId, classId: class9.id, name: "B" },
  });

  const superAdmin = await createUser({
    schoolId,
    identifier: "superadmin",
    displayName: "Super Admin",
    passwordHash,
    roleCode: ROLE_CODES.SCHOOL_SUPER_ADMIN,
  });
  await prisma.userScope.create({
    data: { userId: superAdmin.id, scopeType: "school" },
  });

  const teacher = await createUser({
    schoolId,
    identifier: "TCH-8A",
    displayName: "Priya Teacher",
    passwordHash,
    roleCode: ROLE_CODES.TEACHER,
  });
  await prisma.teacher.create({
    data: {
      schoolId,
      userId: teacher.id,
      employeeId: "TCH-8A",
      fullName: "Priya Teacher",
    },
  });
  await prisma.userScope.create({
    data: {
      userId: teacher.id,
      scopeType: "section",
      classId: class8.id,
      sectionId: section8A.id,
    },
  });

  const studentSpecs = [
    { admission: "AN2021-0001", name: "Arun Kumar" },
    { admission: "AN2021-0087", name: "Aarav S." },
    { admission: "AN2021-0091", name: "Diya P." },
  ];

  const createdStudents = [];
  for (const s of studentSpecs) {
    const user = await createUser({
      schoolId,
      identifier: s.admission,
      displayName: s.name,
      passwordHash,
      roleCode: ROLE_CODES.STUDENT,
    });
    const student = await prisma.student.create({
      data: {
        schoolId,
        userId: user.id,
        admissionNumber: s.admission,
        fullName: s.name,
        classId: class8.id,
        sectionId: section8A.id,
      },
    });
    await prisma.userScope.create({
      data: { userId: user.id, scopeType: "self", studentId: student.id },
    });
    createdStudents.push(student);
  }

  const arun = createdStudents[0];

  const parentUser = await createUser({
    schoolId,
    identifier: "9000000001",
    displayName: "Arun Parent",
    passwordHash,
    roleCode: ROLE_CODES.PARENT,
  });
  const parent = await prisma.parent.create({
    data: {
      schoolId,
      userId: parentUser.id,
      fullName: "Arun Parent",
      contact: "9000000001",
    },
  });
  await prisma.parentStudent.create({
    data: { schoolId, parentId: parent.id, studentId: arun.id },
  });
  await prisma.userScope.create({
    data: {
      userId: parentUser.id,
      scopeType: "children",
      studentId: arun.id,
    },
  });

  const nineBUser = await createUser({
    schoolId,
    identifier: "AN2021-0901",
    displayName: "Maria 9B",
    passwordHash,
    roleCode: ROLE_CODES.STUDENT,
  });
  const maria = await prisma.student.create({
    data: {
      schoolId,
      userId: nineBUser.id,
      admissionNumber: "AN2021-0901",
      fullName: "Maria 9B",
      classId: class9.id,
      sectionId: section9B.id,
    },
  });
  await prisma.userScope.create({
    data: { userId: nineBUser.id, scopeType: "self", studentId: maria.id },
  });

  return { schoolId, section8A, section9B, teacher, arun, maria };
}

async function seedSchoolB(passwordHash: string) {
  const schoolId = randomUUID();
  await setSchool(schoolId);
  await prisma.school.create({
    data: {
      id: schoolId,
      slug: "school-b",
      name: "School B",
      tagline: "Isolation fixture",
      location: "Test",
      poweredBy: "CREOVY Digital Solutions",
      receiptPrefix: "SB/26-27",
      theme: schoolBTheme,
      typography: arulNeriTypography,
    },
  });
  await seedRolesForSchool(schoolId);
  const year = await prisma.academicYear.create({
    data: { schoolId, name: "2026-27", isActive: true },
  });
  const cls = await prisma.class.create({
    data: { schoolId, academicYearId: year.id, name: "8" },
  });
  const section = await prisma.section.create({
    data: { schoolId, classId: cls.id, name: "A" },
  });
  const teacher = await createUser({
    schoolId,
    identifier: "TCH-B",
    displayName: "School B Teacher",
    passwordHash,
    roleCode: ROLE_CODES.TEACHER,
  });
  await prisma.teacher.create({
    data: {
      schoolId,
      userId: teacher.id,
      employeeId: "TCH-B",
      fullName: "School B Teacher",
    },
  });
  await prisma.userScope.create({
    data: {
      userId: teacher.id,
      scopeType: "section",
      classId: cls.id,
      sectionId: section.id,
    },
  });
  const stuUser = await createUser({
    schoolId,
    identifier: "SB-0001",
    displayName: "School B Student",
    passwordHash,
    roleCode: ROLE_CODES.STUDENT,
  });
  const student = await prisma.student.create({
    data: {
      schoolId,
      userId: stuUser.id,
      admissionNumber: "SB-0001",
      fullName: "School B Student",
      classId: cls.id,
      sectionId: section.id,
    },
  });
  return { schoolId, section, teacher, student };
}

async function main() {
  const password = process.env.SEED_PASSWORD ?? "Password123!";
  const passwordHash = await bcrypt.hash(password, 10);

  await seedPermissions();
  await enableRls();
  const a = await seedArulNeri(passwordHash);
  const b = await seedSchoolB(passwordHash);

  console.log("Seed complete.");
  console.log("Demo tenant: arulneri");
  console.log("Isolation fixture tenant: school-b");
  console.log("Password (all demo users):", password);
  console.log("Users:");
  console.log("  superadmin / (web super admin)");
  console.log("  TCH-8A / teacher of 8-A");
  console.log("  9000000001 / parent of Arun");
  console.log("  AN2021-0001 / student Arun");
  console.log("  TCH-B / school-b teacher");
  console.log("section8A", a.section8A.id);
  console.log("schoolB", b.schoolId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
