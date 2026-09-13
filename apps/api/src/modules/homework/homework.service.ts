import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { homeworkCreateSchema, homeworkUpdateSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { HomeworkPolicy } from "./homework.policy";

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

@Injectable()
export class HomeworkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: HomeworkPolicy,
  ) {}

  list(acl: RequestAcl, sectionId?: string, studentId?: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      let targetSection = sectionId;
      let viewerStudentId: string | undefined;

      if (studentId) {
        const student = await tx.student.findFirst({
          where: { id: studentId, schoolId: acl.schoolId },
        });
        if (!student) throw new NotFoundException("Student not found");
        const linked = await tx.parentStudent.findMany({
          where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
        });
        const isChild = linked.some((l) => l.studentId === studentId);
        const isSelf = acl.scopes.some((s) => s.type === "self" && s.studentId === studentId);
        if (!isChild && !isSelf) {
          this.policy.assertReadSection(acl, student.sectionId, student.classId);
        }
        targetSection = student.sectionId;
        viewerStudentId = student.id;
      } else if (acl.scopes.some((s) => s.type === "self")) {
        const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
        if (!me) return [];
        targetSection = me.sectionId;
        viewerStudentId = me.id;
      } else if (!targetSection && acl.scopes.some((s) => s.type === "section")) {
        targetSection = acl.scopes.find((s) => s.type === "section")?.sectionId;
      } else if (!targetSection && acl.scopes.some((s) => s.type === "children")) {
        const linked = await tx.parentStudent.findMany({
          where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
          include: { student: true },
        });
        const sectionIds = [...new Set(linked.map((l) => l.student.sectionId))];
        if (sectionIds.length === 0) return [];
        const rows = await tx.homework.findMany({
          where: { schoolId: acl.schoolId, sectionId: { in: sectionIds } },
          include: { section: { include: { class: true } }, completions: true },
          orderBy: { dueDate: "asc" },
          take: 200,
        });
        return rows.map((h) => toDto(h));
      }

      if (!targetSection) {
        if (!acl.scopes.some((s) => s.type === "school")) return [];
        const rows = await tx.homework.findMany({
          where: { schoolId: acl.schoolId },
          include: { section: { include: { class: true } }, completions: true },
          orderBy: { dueDate: "asc" },
          take: 200,
        });
        return rows.map((h) => toDto(h, viewerStudentId));
      }

      const section = await tx.section.findFirst({
        where: { id: targetSection, schoolId: acl.schoolId },
      });
      if (!section) throw new NotFoundException("Section not found");
      if (!viewerStudentId) this.policy.assertReadSection(acl, section.id, section.classId);
      const rows = await tx.homework.findMany({
        where: { schoolId: acl.schoolId, sectionId: section.id },
        include: { section: { include: { class: true } }, completions: true },
        orderBy: { dueDate: "asc" },
        take: 200,
      });
      return rows.map((h) => toDto(h, viewerStudentId));
    });
  }

  get(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const row = await tx.homework.findFirst({
        where: { id, schoolId: acl.schoolId },
        include: { section: { include: { class: true } }, completions: true },
      });
      if (!row) throw new NotFoundException("Homework not found");
      const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
      const linked = await tx.parentStudent.findMany({
        where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
        include: { student: true },
      });
      const childInSection = linked.some((l) => l.student.sectionId === row.sectionId);
      this.policy.assertReadSection(acl, row.sectionId, row.classId, {
        selfInSection: me?.sectionId === row.sectionId,
        childInSection,
      });
      return toDto(row, me?.id);
    });
  }

  create(acl: RequestAcl, body: unknown) {
    const input = homeworkCreateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: input.sectionId, classId: input.classId, schoolId: acl.schoolId },
      });
      if (!section) throw new BadRequestException("Section does not belong to this class");
      this.policy.assertCreateSection(acl, section.id, section.classId);
      const row = await tx.homework.create({
        data: {
          schoolId: acl.schoolId,
          classId: input.classId,
          sectionId: input.sectionId,
          title: input.title,
          body: input.body,
          dueDate: parseDate(input.dueDate),
          createdByUserId: acl.userId,
        },
        include: { section: { include: { class: true } }, completions: true },
      });
      return toDto(row);
    });
  }

  update(acl: RequestAcl, id: string, body: unknown) {
    const input = homeworkUpdateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.homework.findFirst({ where: { id, schoolId: acl.schoolId } });
      if (!existing) throw new NotFoundException("Homework not found");
      this.policy.assertCreateSection(acl, existing.sectionId, existing.classId);
      const row = await tx.homework.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          body: input.body,
          dueDate: input.dueDate ? parseDate(input.dueDate) : undefined,
        },
        include: { section: { include: { class: true } }, completions: true },
      });
      return toDto(row);
    });
  }

  complete(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const student = await tx.student.findFirst({
        where: { schoolId: acl.schoolId, userId: acl.userId },
      });
      if (!student) throw new ForbiddenComplete();
      this.policy.assertComplete(acl, student.id);
      const homework = await tx.homework.findFirst({
        where: { id, schoolId: acl.schoolId, sectionId: student.sectionId },
      });
      if (!homework) throw new NotFoundException("Homework not found");
      await tx.homeworkCompletion.upsert({
        where: { homeworkId_studentId: { homeworkId: homework.id, studentId: student.id } },
        update: { completedAt: new Date() },
        create: { schoolId: acl.schoolId, homeworkId: homework.id, studentId: student.id },
      });
      const row = await tx.homework.findFirstOrThrow({
        where: { id: homework.id },
        include: { section: { include: { class: true } }, completions: true },
      });
      return toDto(row, student.id);
    });
  }
}

class ForbiddenComplete extends BadRequestException {
  constructor() {
    super("Only a student can complete homework");
  }
}

function toDto(
  h: {
    id: string;
    title: string;
    body: string;
    dueDate: Date;
    sectionId: string;
    classId: string;
    section: { name: string; class: { name: string } };
    completions: { studentId: string }[];
  },
  studentId?: string,
) {
  return {
    id: h.id,
    title: h.title,
    body: h.body,
    dueDate: h.dueDate.toISOString().slice(0, 10),
    sectionId: h.sectionId,
    classId: h.classId,
    label: `${h.section.class.name}-${h.section.name}`,
    completed: studentId ? h.completions.some((c) => c.studentId === studentId) : undefined,
    completionCount: h.completions.length,
  };
}
