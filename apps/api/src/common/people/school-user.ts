import { ConflictException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createSchoolUser(
  tx: Prisma.TransactionClient,
  opts: {
    schoolId: string;
    identifier: string;
    displayName: string;
    passwordHash: string;
    roleCode: string;
    scopes: {
      scopeType: string;
      classId?: string | null;
      sectionId?: string | null;
      studentId?: string | null;
    }[];
  },
) {
  const existing = await tx.user.findFirst({
    where: { schoolId: opts.schoolId, identifier: opts.identifier },
  });
  if (existing) throw new ConflictException("Identifier already exists in this school");

  const user = await tx.user.create({
    data: {
      schoolId: opts.schoolId,
      identifier: opts.identifier,
      displayName: opts.displayName,
      passwordHash: opts.passwordHash,
    },
  });
  const role = await tx.role.findUniqueOrThrow({
    where: { schoolId_code: { schoolId: opts.schoolId, code: opts.roleCode } },
  });
  await tx.userRole.create({
    data: { userId: user.id, roleId: role.id, schoolId: opts.schoolId },
  });
  for (const scope of opts.scopes) {
    await tx.userScope.create({
      data: {
        schoolId: opts.schoolId,
        userId: user.id,
        scopeType: scope.scopeType,
        classId: scope.classId ?? null,
        sectionId: scope.sectionId ?? null,
        studentId: scope.studentId ?? null,
      },
    });
  }
  return user;
}

export function hasSchoolScope(acl: { scopes: { type: string }[] }) {
  return acl.scopes.some((s) => s.type === "school");
}

export function sectionScopeIds(acl: { scopes: { type: string; sectionId?: string }[] }) {
  return new Set(acl.scopes.filter((s) => s.type === "section" && s.sectionId).map((s) => s.sectionId!));
}

export function classScopeIds(acl: { scopes: { type: string; classId?: string }[] }) {
  return new Set(acl.scopes.filter((s) => s.type === "class" && s.classId).map((s) => s.classId!));
}

export function childStudentIds(acl: { scopes: { type: string; studentId?: string }[] }) {
  return new Set(
    acl.scopes.filter((s) => s.type === "children" && s.studentId).map((s) => s.studentId!),
  );
}

export function selfStudentIds(acl: { scopes: { type: string; studentId?: string }[] }) {
  return new Set(acl.scopes.filter((s) => s.type === "self" && s.studentId).map((s) => s.studentId!));
}
