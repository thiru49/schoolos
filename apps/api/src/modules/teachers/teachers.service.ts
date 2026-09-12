import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ROLE_CODES } from "@schoolos/permissions";
import { teacherCreateSchema, teacherUpdateSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { createSchoolUser, hashPassword } from "../../common/people/school-user";
import { PrismaService } from "../../prisma/prisma.service";
import { TeachersPolicy } from "./teachers.policy";

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: TeachersPolicy,
  ) {}

  list(acl: RequestAcl, q?: string) {
    this.policy.assertRead(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const rows = await tx.teacher.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(this.policy.isSelfOnly(acl) ? { userId: acl.userId } : {}),
          ...(q
            ? {
                OR: [
                  { fullName: { contains: q, mode: "insensitive" } },
                  { employeeId: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { user: { include: { userScopes: true } } },
        orderBy: { employeeId: "asc" },
        take: 200,
      });
      return rows.map(toDto);
    });
  }

  get(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const teacher = await tx.teacher.findFirst({
        where: { id, schoolId: acl.schoolId },
        include: { user: { include: { userScopes: true } } },
      });
      if (!teacher) throw new NotFoundException("Teacher not found");
      this.policy.assertSee(acl, teacher);
      return toDto(teacher);
    });
  }

  async create(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = teacherCreateSchema.parse(body);
    if ((input.sectionId && !input.classId) || (input.classId && !input.sectionId)) {
      throw new BadRequestException("classId and sectionId must be provided together");
    }
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      if (input.sectionId && input.classId) {
        const section = await tx.section.findFirst({
          where: { id: input.sectionId, classId: input.classId, schoolId: acl.schoolId },
        });
        if (!section) throw new BadRequestException("Section does not belong to this class");
      }
      const passwordHash = await hashPassword(input.password);
      try {
        const user = await createSchoolUser(tx, {
          schoolId: acl.schoolId,
          identifier: input.employeeId,
          displayName: input.fullName,
          passwordHash,
          roleCode: ROLE_CODES.TEACHER,
          scopes:
            input.sectionId && input.classId
              ? [{ scopeType: "section", classId: input.classId, sectionId: input.sectionId }]
              : [],
        });
        const teacher = await tx.teacher.create({
          data: {
            schoolId: acl.schoolId,
            userId: user.id,
            employeeId: input.employeeId,
            fullName: input.fullName,
          },
          include: { user: { include: { userScopes: true } } },
        });
        return toDto(teacher);
      } catch (e) {
        if (e instanceof ConflictException) throw e;
        throw new ConflictException("Employee ID already exists in this school");
      }
    });
  }

  update(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertWrite(acl);
    const input = teacherUpdateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const teacher = await tx.teacher.findFirst({ where: { id, schoolId: acl.schoolId } });
      if (!teacher) throw new NotFoundException("Teacher not found");
      const updated = await tx.teacher.update({
        where: { id: teacher.id },
        data: { fullName: input.fullName },
        include: { user: { include: { userScopes: true } } },
      });
      if (input.fullName) {
        await tx.user.update({ where: { id: teacher.userId }, data: { displayName: input.fullName } });
      }
      return toDto(updated);
    });
  }
}

function toDto(t: {
  id: string;
  employeeId: string;
  fullName: string;
  user: { userScopes: { scopeType: string; sectionId: string | null }[] };
}) {
  return {
    id: t.id,
    employeeId: t.employeeId,
    fullName: t.fullName,
    sections: t.user.userScopes
      .filter((s) => s.scopeType === "section" && s.sectionId)
      .map((s) => s.sectionId as string),
  };
}
