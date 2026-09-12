import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ROLE_CODES } from "@schoolos/permissions";
import { parentCreateSchema, parentLinkSchema, parentUpdateSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { createSchoolUser, hashPassword } from "../../common/people/school-user";
import { PrismaService } from "../../prisma/prisma.service";
import { ParentsPolicy } from "./parents.policy";

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: ParentsPolicy,
  ) {}

  list(acl: RequestAcl, q?: string) {
    this.policy.assertRead(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const rows = await tx.parent.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(this.policy.isSelfOnly(acl) ? { userId: acl.userId } : {}),
          ...(q
            ? {
                OR: [
                  { fullName: { contains: q, mode: "insensitive" } },
                  { contact: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { children: { include: { student: true } } },
        orderBy: { fullName: "asc" },
        take: 200,
      });
      return rows.map(toDto);
    });
  }

  get(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const parent = await tx.parent.findFirst({
        where: { id, schoolId: acl.schoolId },
        include: { children: { include: { student: true } } },
      });
      if (!parent) throw new NotFoundException("Parent not found");
      this.policy.assertSee(acl, parent);
      return toDto(parent);
    });
  }

  async create(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = parentCreateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const passwordHash = await hashPassword(input.password);
      const user = await createSchoolUser(tx, {
        schoolId: acl.schoolId,
        identifier: input.contact,
        displayName: input.fullName,
        passwordHash,
        roleCode: ROLE_CODES.PARENT,
        scopes: [],
      });
      const parent = await tx.parent.create({
        data: {
          schoolId: acl.schoolId,
          userId: user.id,
          fullName: input.fullName,
          contact: input.contact,
        },
      });
      for (const studentId of input.studentIds ?? []) {
        await this.linkChild(tx, acl.schoolId, parent.id, user.id, studentId);
      }
      const full = await tx.parent.findFirstOrThrow({
        where: { id: parent.id },
        include: { children: { include: { student: true } } },
      });
      return toDto(full);
    });
  }

  update(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertWrite(acl);
    const input = parentUpdateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const parent = await tx.parent.findFirst({ where: { id, schoolId: acl.schoolId } });
      if (!parent) throw new NotFoundException("Parent not found");
      const updated = await tx.parent.update({
        where: { id: parent.id },
        data: { fullName: input.fullName, contact: input.contact },
        include: { children: { include: { student: true } } },
      });
      if (input.fullName) {
        await tx.user.update({ where: { id: parent.userId }, data: { displayName: input.fullName } });
      }
      return toDto(updated);
    });
  }

  link(acl: RequestAcl, parentId: string, body: unknown) {
    this.policy.assertWrite(acl);
    const input = parentLinkSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const parent = await tx.parent.findFirst({ where: { id: parentId, schoolId: acl.schoolId } });
      if (!parent) throw new NotFoundException("Parent not found");
      await this.linkChild(tx, acl.schoolId, parent.id, parent.userId, input.studentId);
      const full = await tx.parent.findFirstOrThrow({
        where: { id: parent.id },
        include: { children: { include: { student: true } } },
      });
      return toDto(full);
    });
  }

  unlink(acl: RequestAcl, parentId: string, studentId: string) {
    this.policy.assertWrite(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const parent = await tx.parent.findFirst({ where: { id: parentId, schoolId: acl.schoolId } });
      if (!parent) throw new NotFoundException("Parent not found");
      await tx.parentStudent.deleteMany({
        where: { schoolId: acl.schoolId, parentId: parent.id, studentId },
      });
      await tx.userScope.deleteMany({
        where: { schoolId: acl.schoolId, userId: parent.userId, scopeType: "children", studentId },
      });
      const full = await tx.parent.findFirstOrThrow({
        where: { id: parent.id },
        include: { children: { include: { student: true } } },
      });
      return toDto(full);
    });
  }

  private async linkChild(
    tx: Prisma.TransactionClient,
    schoolId: string,
    parentId: string,
    userId: string,
    studentId: string,
  ) {
    const student = await tx.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundException("Student not found");
    try {
      await tx.parentStudent.create({
        data: { schoolId, parentId, studentId },
      });
    } catch {
      throw new ConflictException("Student already linked to this parent");
    }
    await tx.userScope.create({
      data: { schoolId, userId, scopeType: "children", studentId },
    });
  }
}

function toDto(p: {
  id: string;
  fullName: string;
  contact: string | null;
  children: { student: { id: string; fullName: string; admissionNumber: string } }[];
}) {
  return {
    id: p.id,
    fullName: p.fullName,
    contact: p.contact,
    children: p.children.map((c) => ({
      studentId: c.student.id,
      fullName: c.student.fullName,
      admissionNumber: c.student.admissionNumber,
    })),
  };
}
