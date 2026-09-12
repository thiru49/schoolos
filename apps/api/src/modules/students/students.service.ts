import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";
import { studentCreateSchema, studentUpdateSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import {
  classScopeIds,
  createSchoolUser,
  hashPassword,
  hasSchoolScope,
  sectionScopeIds,
} from "../../common/people/school-user";
import { PrismaService } from "../../prisma/prisma.service";
import { StudentsPolicy } from "./students.policy";

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: StudentsPolicy,
  ) {}

  list(acl: RequestAcl, sectionId?: string, q?: string) {
    this.policy.assertRead(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const where: Prisma.StudentWhereInput = { schoolId: acl.schoolId };

      if (sectionId) {
        const section = await tx.section.findFirst({
          where: { id: sectionId, schoolId: acl.schoolId },
        });
        if (!section) throw new NotFoundException("Section not found");
        const linked = this.policy.visibleStudentIds(acl);
        const canSection = this.policy.canSeeSection(acl, section.id, section.classId);
        if (!hasSchoolScope(acl) && !canSection && linked.size === 0) {
          throw new NotFoundException("Section not found");
        }
        where.sectionId = sectionId;
        if (!hasSchoolScope(acl) && !canSection) {
          where.id = { in: [...linked] };
        }
      } else if (!hasSchoolScope(acl)) {
        const sectionIds = [...sectionScopeIds(acl)];
        const classIds = [...classScopeIds(acl)];
        const studentIds = [...this.policy.visibleStudentIds(acl)];
        if (sectionIds.length === 0 && classIds.length === 0 && studentIds.length === 0) return [];
        const parts: Prisma.StudentWhereInput[] = [];
        if (sectionIds.length) parts.push({ sectionId: { in: sectionIds } });
        if (classIds.length) parts.push({ classId: { in: classIds } });
        if (studentIds.length) parts.push({ id: { in: studentIds } });
        where.OR = parts;
      }
      if (q) {
        const search: Prisma.StudentWhereInput = {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { admissionNumber: { contains: q, mode: "insensitive" } },
          ],
        };
        if (where.OR) {
          where.AND = [{ OR: where.OR }, search];
          delete where.OR;
        } else {
          Object.assign(where, search);
        }
      }
      const rows = await tx.student.findMany({
        where,
        include: { class: true, section: true },
        orderBy: { admissionNumber: "asc" },
        take: 200,
      });
      return rows.map(toDto);
    });
  }

  get(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const student = await tx.student.findFirst({
        where: { id, schoolId: acl.schoolId },
        include: { class: true, section: true },
      });
      if (!student) throw new NotFoundException("Student not found");
      this.policy.assertSeeStudent(acl, {
        id: student.id,
        sectionId: student.sectionId,
        classId: student.classId,
      });
      return toDto(student);
    });
  }

  async create(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = studentCreateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: input.sectionId, schoolId: acl.schoolId, classId: input.classId },
      });
      if (!section) throw new BadRequestException("Section does not belong to this class");
      const passwordHash = await hashPassword(input.password);
      const user = await createSchoolUser(tx, {
        schoolId: acl.schoolId,
        identifier: input.admissionNumber,
        displayName: input.fullName,
        passwordHash,
        roleCode: ROLE_CODES.STUDENT,
        scopes: [],
      });
      try {
        const student = await tx.student.create({
          data: {
            schoolId: acl.schoolId,
            userId: user.id,
            admissionNumber: input.admissionNumber,
            fullName: input.fullName,
            classId: input.classId,
            sectionId: input.sectionId,
          },
          include: { class: true, section: true },
        });
        await tx.userScope.create({
          data: {
            schoolId: acl.schoolId,
            userId: user.id,
            scopeType: "self",
            studentId: student.id,
          },
        });
        await tx.auditLog.create({
          data: {
            schoolId: acl.schoolId,
            actorUserId: acl.userId,
            action: PERMISSIONS.STUDENTS_WRITE,
            resource: "student",
            resourceId: student.id,
          },
        });
        return toDto(student);
      } catch {
        throw new ConflictException("Admission number already exists in this school");
      }
    });
  }

  update(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertWrite(acl);
    const input = studentUpdateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const student = await tx.student.findFirst({ where: { id, schoolId: acl.schoolId } });
      if (!student) throw new NotFoundException("Student not found");
      if (input.sectionId || input.classId) {
        const classId = input.classId ?? student.classId;
        const sectionId = input.sectionId ?? student.sectionId;
        const section = await tx.section.findFirst({
          where: { id: sectionId, schoolId: acl.schoolId, classId },
        });
        if (!section) throw new BadRequestException("Section does not belong to this class");
      }
      const updated = await tx.student.update({
        where: { id: student.id },
        data: {
          fullName: input.fullName,
          classId: input.classId,
          sectionId: input.sectionId,
        },
        include: { class: true, section: true },
      });
      if (input.fullName) {
        await tx.user.update({
          where: { id: student.userId },
          data: { displayName: input.fullName },
        });
      }
      await tx.auditLog.create({
        data: {
          schoolId: acl.schoolId,
          actorUserId: acl.userId,
          action: PERMISSIONS.STUDENTS_WRITE,
          resource: "student",
          resourceId: student.id,
        },
      });
      return toDto(updated);
    });
  }
}

function toDto(s: {
  id: string;
  admissionNumber: string;
  fullName: string;
  classId: string;
  sectionId: string;
  status: string;
  class: { name: string };
  section: { name: string };
}) {
  return {
    id: s.id,
    admissionNumber: s.admissionNumber,
    fullName: s.fullName,
    classId: s.classId,
    sectionId: s.sectionId,
    className: s.class.name,
    sectionName: s.section.name,
    status: s.status,
    label: `${s.class.name}-${s.section.name}`,
  };
}
