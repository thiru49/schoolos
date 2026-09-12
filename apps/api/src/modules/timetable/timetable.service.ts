import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@schoolos/permissions";
import { subjectCreateSchema, timetablePeriodSchema, timetablePublishSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { TimetablePolicy } from "./timetable.policy";

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: TimetablePolicy,
  ) {}

  listSubjects(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.subject.findMany({ where: { schoolId: acl.schoolId }, orderBy: { name: "asc" } }),
    );
  }

  createSubject(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = subjectCreateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.subject.create({ data: { schoolId: acl.schoolId, name: input.name } }),
    );
  }

  list(acl: RequestAcl, sectionId?: string, weekday?: number, studentId?: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const resolved = await this.resolveSection(tx, acl, sectionId, studentId);
      if (!resolved) return [];
      const viaChildOrSelf = Boolean(studentId) || acl.scopes.some((s) => s.type === "self");
      if (!viaChildOrSelf) this.policy.assertReadSection(acl, resolved.id, resolved.classId);
      const publishedOnly = !acl.permissions.includes(PERMISSIONS.TIMETABLE_WRITE)
        && !acl.roles.includes("teacher");
      const rows = await tx.timetablePeriod.findMany({
        where: {
          schoolId: acl.schoolId,
          sectionId: resolved.id,
          ...(weekday ? { weekday } : {}),
          ...(publishedOnly ? { published: true } : {}),
        },
        include: { subject: true, teacher: true, section: { include: { class: true } } },
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      });
      return rows.map(toDto);
    });
  }

  createPeriod(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = timetablePeriodSchema.parse(body);
    if (input.startTime >= input.endTime) throw new BadRequestException("startTime must be before endTime");
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: input.sectionId, classId: input.classId, schoolId: acl.schoolId },
      });
      if (!section) throw new BadRequestException("Section does not belong to this class");
      const period = await tx.timetablePeriod.create({
        data: {
          schoolId: acl.schoolId,
          classId: input.classId,
          sectionId: input.sectionId,
          subjectId: input.subjectId,
          teacherId: input.teacherId,
          weekday: input.weekday,
          startTime: input.startTime,
          endTime: input.endTime,
        },
        include: { subject: true, teacher: true, section: { include: { class: true } } },
      });
      return toDto(period);
    });
  }

  publish(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = timetablePublishSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const result = await tx.timetablePeriod.updateMany({
        where: { schoolId: acl.schoolId, sectionId: input.sectionId },
        data: { published: true },
      });
      return { published: result.count };
    });
  }

  remove(acl: RequestAcl, id: string) {
    this.policy.assertWrite(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const row = await tx.timetablePeriod.findFirst({ where: { id, schoolId: acl.schoolId } });
      if (!row) throw new NotFoundException("Period not found");
      await tx.timetablePeriod.delete({ where: { id: row.id } });
      return { deleted: true };
    });
  }

  private async resolveSection(
    tx: Prisma.TransactionClient,
    acl: RequestAcl,
    sectionId?: string,
    studentId?: string,
  ) {
    if (studentId) {
      const student = await tx.student.findFirst({ where: { id: studentId, schoolId: acl.schoolId } });
      if (!student) throw new NotFoundException("Student not found");
      const linked = await tx.parentStudent.findMany({
        where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
      });
      const isChild = linked.some((l) => l.studentId === studentId);
      const isSelf = acl.scopes.some((s) => s.type === "self" && s.studentId === studentId);
      if (!isChild && !isSelf) this.policy.assertReadSection(acl, student.sectionId, student.classId);
      return { id: student.sectionId, classId: student.classId };
    }
    if (sectionId) {
      const section = await tx.section.findFirst({ where: { id: sectionId, schoolId: acl.schoolId } });
      if (!section) throw new NotFoundException("Section not found");
      return { id: section.id, classId: section.classId };
    }
    if (acl.scopes.some((s) => s.type === "self")) {
      const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
      if (!me) return null;
      return { id: me.sectionId, classId: me.classId };
    }
    const scoped = acl.scopes.find((s) => s.type === "section" && s.sectionId);
    if (scoped?.sectionId) {
      const section = await tx.section.findFirst({
        where: { id: scoped.sectionId, schoolId: acl.schoolId },
      });
      if (!section) return null;
      return { id: section.id, classId: section.classId };
    }
    return null;
  }
}

function toDto(p: {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  published: boolean;
  sectionId: string;
  classId: string;
  subject: { id: string; name: string };
  teacher: { id: string; fullName: string };
  section: { name: string; class: { name: string } };
}) {
  return {
    id: p.id,
    weekday: p.weekday,
    startTime: p.startTime,
    endTime: p.endTime,
    published: p.published,
    sectionId: p.sectionId,
    classId: p.classId,
    subjectId: p.subject.id,
    subjectName: p.subject.name,
    teacherId: p.teacher.id,
    teacherName: p.teacher.fullName,
    label: `${p.section.class.name}-${p.section.name}`,
  };
}
