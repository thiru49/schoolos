import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";
import { studentCreateSchema, studentUpdateSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { createSchoolUser, hashPassword, hasSchoolScope, sectionScopeIds } from "../../common/people/school-user";
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
      const where: {
        schoolId: string;
        sectionId?: string | { in: string[] };
        OR?: { fullName?: { contains: string; mode: "insensitive" }; admissionNumber?: { contains: string; mode: "insensitive" } }[];
      } = { schoolId: acl.schoolId };
      if (sectionId) {
        if (!this.policy.canSeeSection(acl, sectionId)) throw new NotFoundException("Section not found");
        where.sectionId = sectionId;
      } else if (!hasSchoolScope(acl)) {
        const ids = [...sectionScopeIds(acl)];
        if (ids.length === 0) return [];
        where.sectionId = { in: ids };
      }
      if (q) {
        where.OR = [
          { fullName: { contains: q, mode: "insensitive" } },
          { admissionNumber: { contains: q, mode: "insensitive" } },
        ];
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
      this.policy.assertSeeStudent(acl, student);
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
