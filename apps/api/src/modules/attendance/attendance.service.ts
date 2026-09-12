import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  attendanceQuerySchema,
  attendanceReportSchema,
  markAttendanceSchema,
  rosterQuerySchema,
} from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { formatReportCsv, formatRosterCsv, parseAttendanceExportQuery } from "./attendance-csv";
import { AttendancePolicy } from "./attendance.policy";
import { AttendanceRepository } from "./attendance.repository";

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: AttendanceRepository,
    private readonly policy: AttendancePolicy,
    private readonly notifications: NotificationsService,
  ) {}

  async roster(acl: RequestAcl, query: unknown) {
    const q = rosterQuerySchema.parse(query);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await this.repo.findSection(tx, acl.schoolId, q.sectionId);
      if (!section) throw new NotFoundException("Section not found");
      this.policy.assertCanReadSection(acl, section.id, section.classId);
      const students = await this.repo.listSectionStudents(tx, acl.schoolId, section.id);
      const existing = await this.repo.listForSectionDate(
        tx,
        acl.schoolId,
        section.id,
        parseDate(q.date),
      );
      const byStudent = new Map(existing.map((e) => [e.studentId, e.status]));
      return {
        sectionId: section.id,
        date: q.date,
        className: section.class.name,
        sectionName: section.name,
        rows: students.map((s) => ({
          studentId: s.id,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          status: byStudent.get(s.id) ?? null,
        })),
      };
    });
  }

  async mark(acl: RequestAcl, body: unknown) {
    const input = markAttendanceSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await this.repo.findSection(tx, acl.schoolId, input.sectionId);
      if (!section) throw new NotFoundException("Section not found");
      this.policy.assertCanMarkSection(acl, section.id, section.classId);

      const students = await this.repo.listSectionStudents(tx, acl.schoolId, section.id);
      const allowed = new Set(students.map((s) => s.id));
      for (const m of input.marks) {
        if (!allowed.has(m.studentId)) {
          throw new BadRequestException("Student is not in this section");
        }
      }

      const date = parseDate(input.date);
      const saved = await this.repo.upsertMarks(
        tx,
        acl.schoolId,
        acl.userId,
        section.id,
        date,
        input.marks,
      );

      await tx.auditLog.create({
        data: {
          schoolId: acl.schoolId,
          actorUserId: acl.userId,
          action: PERMISSIONS.ATTENDANCE_MARK,
          resource: "attendance",
          resourceId: section.id,
          metadata: { date: input.date, count: saved.length },
        },
      });

      const absences = input.marks.filter((m) => m.status === "A");
      for (const a of absences) {
        const student = students.find((s) => s.id === a.studentId);
        const links = await tx.parentStudent.findMany({
          where: { schoolId: acl.schoolId, studentId: a.studentId },
          include: { parent: true },
        });
        for (const link of links) {
          await tx.inboxNotification.create({
            data: {
              schoolId: acl.schoolId,
              userId: link.parent.userId,
              studentId: a.studentId,
              kind: "absence",
              title: "Attendance marked — Absent",
              body: `${student?.fullName ?? "Student"} was marked absent on ${input.date}.`,
            },
          });
        }
        await this.notifications.enqueueAbsence({
          schoolId: acl.schoolId,
          studentId: a.studentId,
          date: input.date,
        });
      }

      return { saved: saved.length, absencesEnqueued: absences.length };
    });
  }

  async list(acl: RequestAcl, query: unknown) {
    const q = attendanceQuerySchema.parse(query);
    if (q.from && q.to && q.from > q.to) throw new BadRequestException("from must be on or before to");
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      if (q.studentId) {
        const student = await this.repo.findStudent(tx, acl.schoolId, q.studentId);
        if (!student) throw new NotFoundException("Student not found");
        const parent = await this.repo.linkedChildIds(tx, acl.schoolId, acl.userId);
        const linked = parent?.children.map((c) => c.studentId) ?? [];
        this.policy.assertCanReadStudent(acl, student, linked);
        const records = await this.repo.listForStudent(
          tx,
          acl.schoolId,
          student.id,
          q.from ? parseDate(q.from) : undefined,
          q.to ? parseDate(q.to) : undefined,
        );
        return {
          records: records.map((r) => ({
            studentId: r.studentId,
            fullName: r.student.fullName,
            date: r.date.toISOString().slice(0, 10),
            status: r.status,
          })),
        };
      }

      if (q.sectionId && q.date) {
        const section = await this.repo.findSection(tx, acl.schoolId, q.sectionId);
        if (!section) throw new NotFoundException("Section not found");
        this.policy.assertCanReadSection(acl, section.id, section.classId);
        const students = await this.repo.listSectionStudents(tx, acl.schoolId, section.id);
        const existing = await this.repo.listForSectionDate(
          tx,
          acl.schoolId,
          section.id,
          parseDate(q.date),
        );
        const byStudent = new Map(existing.map((e) => [e.studentId, e]));
        return {
          records: students.map((s) => ({
            studentId: s.id,
            fullName: s.fullName,
            date: q.date,
            status: byStudent.get(s.id)?.status ?? null,
          })),
        };
      }

      throw new BadRequestException("Provide studentId or sectionId+date");
    });
  }

  async report(acl: RequestAcl, query: unknown) {
    const q = attendanceReportSchema.parse(query);
    if (q.from > q.to) throw new BadRequestException("from must be on or before to");
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const section = await this.repo.findSection(tx, acl.schoolId, q.sectionId);
      if (!section) throw new NotFoundException("Section not found");
      this.policy.assertCanReadSection(acl, section.id, section.classId);
      const students = await this.repo.listSectionStudents(tx, acl.schoolId, section.id);
      const rows = await this.repo.listRange(
        tx,
        acl.schoolId,
        section.id,
        parseDate(q.from),
        parseDate(q.to),
      );
      const byStudent = new Map<string, { P: number; A: number; L: number; H: number }>();
      for (const s of students) byStudent.set(s.id, { P: 0, A: 0, L: 0, H: 0 });
      for (const r of rows) {
        const bucket = byStudent.get(r.studentId);
        if (!bucket) continue;
        if (r.status === "P" || r.status === "A" || r.status === "L" || r.status === "H") {
          bucket[r.status] += 1;
        }
      }
      return {
        sectionId: section.id,
        label: `${section.class.name}-${section.name}`,
        from: q.from,
        to: q.to,
        rows: students.map((s) => ({
          studentId: s.id,
          fullName: s.fullName,
          admissionNumber: s.admissionNumber,
          ...byStudent.get(s.id)!,
        })),
      };
    });
  }

  async exportCsv(acl: RequestAcl, query: unknown) {
    const parsed = parseAttendanceExportQuery(query);
    if (parsed.kind === "range") {
      const report = await this.report(acl, parsed);
      return formatReportCsv(report.rows);
    }
    const roster = await this.roster(acl, parsed);
    return formatRosterCsv(roster.rows);
  }
}
