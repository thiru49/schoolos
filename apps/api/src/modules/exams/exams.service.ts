import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { examCreateSchema, marksDraftSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { ExamsPolicy } from "./exams.policy";

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: ExamsPolicy,
  ) {}

  list(acl: RequestAcl, sectionId?: string, studentId?: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      if (!sectionId && !studentId && acl.scopes.some((s) => s.type === "children")) {
        const linked = await tx.parentStudent.findMany({
          where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
          include: { student: true },
        });
        const sectionIds = [...new Set(linked.map((l) => l.student.sectionId))];
        if (sectionIds.length === 0) return [];
        const rows = await tx.exam.findMany({
          where: { schoolId: acl.schoolId, sectionId: { in: sectionIds } },
          include: { subject: true, section: { include: { class: true } } },
          orderBy: { examDate: "desc" },
        });
        return rows.map(examDto);
      }

      const section = await this.resolveSection(tx, acl, sectionId, studentId);
      if (!section) {
        if (!acl.scopes.some((s) => s.type === "school")) return [];
        const rows = await tx.exam.findMany({
          where: { schoolId: acl.schoolId },
          include: { subject: true, section: { include: { class: true } } },
          orderBy: { examDate: "desc" },
        });
        return rows.map(examDto);
      }
      const flags = await this.viewerFlags(tx, acl, section.id);
      this.policy.assertReadSection(acl, section.id, section.classId, flags);
      const rows = await tx.exam.findMany({
        where: { schoolId: acl.schoolId, sectionId: section.id },
        include: { subject: true, section: { include: { class: true } } },
        orderBy: { examDate: "desc" },
      });
      return rows.map(examDto);
    });
  }

  get(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id, schoolId: acl.schoolId },
        include: { subject: true, section: { include: { class: true } } },
      });
      if (!exam) throw new NotFoundException("Exam not found");
      const flags = await this.viewerFlags(tx, acl, exam.sectionId);
      this.policy.assertReadSection(acl, exam.sectionId, exam.classId, flags);
      return examDto(exam);
    });
  }

  create(acl: RequestAcl, body: unknown) {
    this.policy.assertWrite(acl);
    const input = examCreateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: input.sectionId, classId: input.classId, schoolId: acl.schoolId },
      });
      if (!section) throw new BadRequestException("Section does not belong to this class");
      const subject = await tx.subject.findFirst({
        where: { id: input.subjectId, schoolId: acl.schoolId },
      });
      if (!subject) throw new BadRequestException("Subject not found");
      const exam = await tx.exam.create({
        data: {
          schoolId: acl.schoolId,
          classId: input.classId,
          sectionId: input.sectionId,
          subjectId: input.subjectId,
          name: input.name,
          examDate: parseDate(input.examDate),
          maxScore: input.maxScore,
        },
        include: { subject: true, section: { include: { class: true } } },
      });
      return examDto(exam);
    });
  }

  entry(acl: RequestAcl, examId: string, studentId?: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, schoolId: acl.schoolId },
        include: { subject: true, section: { include: { class: true } } },
      });
      if (!exam) throw new NotFoundException("Exam not found");
      if (studentId) {
        const student = await tx.student.findFirst({ where: { id: studentId, schoolId: acl.schoolId } });
        if (!student) throw new NotFoundException("Student not found");
        const linked = await tx.parentStudent.findMany({
          where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
        });
        const isChild = linked.some((l) => l.studentId === studentId);
        const isSelf = acl.scopes.some((s) => s.type === "self" && s.studentId === studentId);
        if (!isChild && !isSelf) {
          throw new ForbiddenException("You cannot read this student");
        }
        if (student.sectionId !== exam.sectionId) {
          throw new ForbiddenException("You cannot read this exam");
        }
      }
      const flags = await this.viewerFlags(tx, acl, exam.sectionId);
      this.policy.assertReadSection(acl, exam.sectionId, exam.classId, flags);
      const publishedOnly = !acl.permissions.includes(PERMISSIONS.MARKS_DRAFT)
        && !acl.permissions.includes(PERMISSIONS.MARKS_PUBLISH);
      const students = await tx.student.findMany({
        where: { schoolId: acl.schoolId, sectionId: exam.sectionId, status: "active" },
        orderBy: { admissionNumber: "asc" },
      });
      const marks = await tx.mark.findMany({ where: { schoolId: acl.schoolId, examId: exam.id } });
      const byStudent = new Map(marks.map((m) => [m.studentId, m]));
      let rows = students.map((s) => {
        const m = byStudent.get(s.id);
        return {
          studentId: s.id,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          score: m?.score ?? null,
          status: m?.status ?? null,
        };
      });
      if (publishedOnly) {
        rows = rows.filter((r) => r.status === "published");
      }
      if (studentId) {
        rows = rows.filter((r) => r.studentId === studentId);
      }
      if (acl.scopes.some((s) => s.type === "self") && !studentId) {
        const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
        if (me) rows = rows.filter((r) => r.studentId === me.id);
      }
      return { exam: examDto(exam), rows };
    });
  }

  draft(acl: RequestAcl, examId: string, body: unknown) {
    const input = marksDraftSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const exam = await tx.exam.findFirst({ where: { id: examId, schoolId: acl.schoolId } });
      if (!exam) throw new NotFoundException("Exam not found");
      this.policy.assertDraftSection(acl, exam.sectionId, exam.classId);
      const sectionStudents = await tx.student.findMany({
        where: { schoolId: acl.schoolId, sectionId: exam.sectionId, status: "active" },
      });
      const allowed = new Set(sectionStudents.map((s) => s.id));
      for (const row of input.marks) {
        if (!allowed.has(row.studentId)) throw new BadRequestException("Student is not in this exam section");
        if (row.score > exam.maxScore) throw new BadRequestException("Score exceeds maxScore");
        const existing = await tx.mark.findFirst({
          where: { schoolId: acl.schoolId, examId: exam.id, studentId: row.studentId },
        });
        if (existing?.status === "published") throw new BadRequestException("Published marks cannot be drafted");
        if (existing?.status === "submitted") throw new BadRequestException("Submitted marks must be returned before draft");
        await tx.mark.upsert({
          where: {
            schoolId_examId_studentId: { schoolId: acl.schoolId, examId: exam.id, studentId: row.studentId },
          },
          update: { score: row.score, status: "draft", updatedByUserId: acl.userId },
          create: {
            schoolId: acl.schoolId,
            examId: exam.id,
            studentId: row.studentId,
            score: row.score,
            status: "draft",
            updatedByUserId: acl.userId,
          },
        });
      }
      return this.entry(acl, examId);
    });
  }

  submit(acl: RequestAcl, examId: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const exam = await tx.exam.findFirst({ where: { id: examId, schoolId: acl.schoolId } });
      if (!exam) throw new NotFoundException("Exam not found");
      this.policy.assertSubmitSection(acl, exam.sectionId, exam.classId);
      const students = await tx.student.findMany({
        where: { schoolId: acl.schoolId, sectionId: exam.sectionId, status: "active" },
      });
      const marks = await tx.mark.findMany({ where: { schoolId: acl.schoolId, examId: exam.id } });
      const byStudent = new Map(marks.map((m) => [m.studentId, m]));
      const missing = students.filter((s) => !byStudent.get(s.id));
      if (missing.length > 0) throw new BadRequestException("Incomplete: every student needs a draft score");
      await tx.mark.updateMany({
        where: { schoolId: acl.schoolId, examId: exam.id, status: "draft" },
        data: { status: "submitted", updatedByUserId: acl.userId },
      });
      await tx.auditLog.create({
        data: {
          schoolId: acl.schoolId,
          actorUserId: acl.userId,
          action: PERMISSIONS.MARKS_SUBMIT,
          resource: "exam",
          resourceId: exam.id,
        },
      });
      return { submitted: students.length };
    });
  }

  publish(acl: RequestAcl, examId: string) {
    this.policy.assertPublish(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const exam = await tx.exam.findFirst({ where: { id: examId, schoolId: acl.schoolId } });
      if (!exam) throw new NotFoundException("Exam not found");
      const result = await tx.mark.updateMany({
        where: { schoolId: acl.schoolId, examId: exam.id, status: "submitted" },
        data: { status: "published", updatedByUserId: acl.userId },
      });
      if (result.count === 0) throw new BadRequestException("No submitted marks to publish");
      return { published: result.count };
    });
  }

  queue(acl: RequestAcl) {
    this.policy.assertPublish(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const exams = await tx.exam.findMany({
        where: { schoolId: acl.schoolId, marks: { some: { status: "submitted" } } },
        include: { subject: true, section: { include: { class: true } }, marks: true },
        orderBy: { examDate: "desc" },
      });
      return exams.map((e) => ({
        ...examDto(e),
        submittedCount: e.marks.filter((m) => m.status === "submitted").length,
      }));
    });
  }

  private async viewerFlags(
    tx: import("@prisma/client").Prisma.TransactionClient,
    acl: RequestAcl,
    sectionId: string,
  ) {
    const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
    const linked = await tx.parentStudent.findMany({
      where: { schoolId: acl.schoolId, parent: { userId: acl.userId } },
      include: { student: true },
    });
    return {
      selfInSection: me?.sectionId === sectionId,
      childInSection: linked.some((l) => l.student.sectionId === sectionId),
    };
  }

  private async resolveSection(
    tx: import("@prisma/client").Prisma.TransactionClient,
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
    if (acl.scopes.some((s) => s.type === "school") && !sectionId) {
      return null;
    }
    return null;
  }
}

function examDto(e: {
  id: string;
  name: string;
  examDate: Date;
  maxScore: number;
  sectionId: string;
  classId: string;
  subject: { id: string; name: string };
  section: { name: string; class: { name: string } };
}) {
  return {
    id: e.id,
    name: e.name,
    examDate: e.examDate.toISOString().slice(0, 10),
    maxScore: e.maxScore,
    sectionId: e.sectionId,
    classId: e.classId,
    subjectId: e.subject.id,
    subjectName: e.subject.name,
    label: `${e.section.class.name}-${e.section.name}`,
  };
}
