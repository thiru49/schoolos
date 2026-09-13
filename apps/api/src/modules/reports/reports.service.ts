import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestAcl } from "../../common/types/request-acl";
import { ReportsPolicy } from "./reports.policy";
import {
  formatFeeCollectionCsv,
  formatPaymentsCsv,
  formatProgressTabulationCsv,
  formatStudentListCsv,
  formatTeacherWorkloadCsv,
} from "./reports-csv";
import type {
  FeeCollectionReportQuery,
  PaymentReportQuery,
  ProgressReportQuery,
  StudentListReportQuery,
  TeacherWorkloadReportQuery,
} from "./dto/reports-query.dto";

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: ReportsPolicy,
  ) {}

  getAvailableReports(acl: RequestAcl) {
    const list: Array<{
      code: string;
      name: string;
      description: string;
      permission: string;
    }> = [];

    if (acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE)) {
      list.push({
        code: "attendance",
        name: "Attendance Report",
        description: "Daily / monthly attendance by class",
        permission: PERMISSIONS.REPORTS_ATTENDANCE,
      });
    }

    if (acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
      list.push({
        code: "progress",
        name: "Student Progress",
        description: "Exam and subject performance",
        permission: PERMISSIONS.REPORTS_PROGRESS,
      });
      list.push({
        code: "students",
        name: "Student List",
        description: "Class and section-wise student records",
        permission: PERMISSIONS.REPORTS_PROGRESS,
      });

      if (this.policy.canAccessTeacherWorkload(acl)) {
        list.push({
          code: "teachers",
          name: "Teacher Workload",
          description: "Assigned classes and periods",
          permission: PERMISSIONS.REPORTS_PROGRESS,
        });
      }
    }

    if (acl.permissions.includes(PERMISSIONS.REPORTS_FEES)) {
      list.push({
        code: "fee_collection",
        name: "Fee Collection",
        description: "Paid, pending and overdue fees",
        permission: PERMISSIONS.REPORTS_FEES,
      });
      list.push({
        code: "payments",
        name: "Payment Report",
        description: "Payment mode and date-wise summary",
        permission: PERMISSIONS.REPORTS_FEES,
      });
    }

    return { reports: list };
  }

  async getFeeCollectionReport(acl: RequestAcl, query: FeeCollectionReportQuery) {
    this.policy.assertCanAccessFeeReports(acl);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      await this.validateClassAndSection(tx, acl.schoolId, query.classId, query.sectionId);

      const feeHeads = await tx.feeHead.findMany({
        where: { schoolId: acl.schoolId },
        orderBy: { name: "asc" },
      });
      const headsTotal = feeHeads.reduce((acc, h) => acc + h.amount, 0);

      const students = await tx.student.findMany({
        where: {
          schoolId: acl.schoolId,
          status: "active",
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.sectionId ? { sectionId: query.sectionId } : {}),
        },
        include: {
          class: true,
          section: true,
        },
        orderBy: [
          { class: { name: "asc" } },
          { section: { name: "asc" } },
          { admissionNumber: "asc" },
        ],
      });

      const studentIds = students.map((s) => s.id);
      const payments = studentIds.length > 0
        ? await tx.feePayment.findMany({
            where: {
              schoolId: acl.schoolId,
              studentId: { in: studentIds },
            },
            include: { feeHead: true },
          })
        : [];

      const paidByStudent = new Map<string, number>();
      const paidByHead = new Map<string, number>();

      for (const p of payments) {
        paidByStudent.set(p.studentId, (paidByStudent.get(p.studentId) ?? 0) + p.amount);
        paidByHead.set(p.feeHeadId, (paidByHead.get(p.feeHeadId) ?? 0) + p.amount);
      }

      const rows = students.map((s) => {
        const totalPaid = paidByStudent.get(s.id) ?? 0;
        const balanceDue = Math.max(0, headsTotal - totalPaid);
        let status = "unpaid";
        if (totalPaid >= headsTotal && headsTotal > 0) status = "paid";
        else if (totalPaid > 0) status = "partial";

        return {
          studentId: s.id,
          admissionNumber: s.admissionNumber,
          studentName: s.fullName,
          className: s.class.name,
          sectionName: s.section.name,
          totalExpected: headsTotal,
          totalPaid,
          balanceDue,
          status,
        };
      });

      const totalExpected = headsTotal * students.length;
      const totalCollected = rows.reduce((acc, r) => acc + r.totalPaid, 0);
      const totalOutstanding = Math.max(0, totalExpected - totalCollected);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

      const feeHeadsBreakdown = feeHeads.map((h) => {
        const expected = h.amount * students.length;
        const collected = paidByHead.get(h.id) ?? 0;
        return {
          id: h.id,
          name: h.name,
          amountPerStudent: h.amount,
          totalExpected: expected,
          totalCollected: collected,
          totalOutstanding: Math.max(0, expected - collected),
        };
      });

      return {
        summary: {
          studentCount: students.length,
          totalExpected,
          totalCollected,
          totalOutstanding,
          collectionRate: Number(collectionRate.toFixed(1)),
        },
        feeHeadsBreakdown,
        rows,
      };
    });
  }

  async exportFeeCollectionCsv(acl: RequestAcl, query: FeeCollectionReportQuery): Promise<string> {
    const report = await this.getFeeCollectionReport(acl, query);
    return formatFeeCollectionCsv(report);
  }

  async getPaymentReport(acl: RequestAcl, query: PaymentReportQuery) {
    this.policy.assertCanAccessFeeReports(acl);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      await this.validateClassAndSection(tx, acl.schoolId, query.classId, query.sectionId);

      const fromDate = query.from ? new Date(`${query.from}T00:00:00.000Z`) : undefined;
      const toDate = query.to ? new Date(`${query.to}T23:59:59.999Z`) : undefined;

      const payments = await tx.feePayment.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(query.method ? { method: query.method } : {}),
          ...(query.studentId ? { studentId: query.studentId } : {}),
          ...(fromDate || toDate
            ? {
                createdAt: {
                  ...(fromDate ? { gte: fromDate } : {}),
                  ...(toDate ? { lte: toDate } : {}),
                },
              }
            : {}),
          student: {
            schoolId: acl.schoolId,
            ...(query.classId ? { classId: query.classId } : {}),
            ...(query.sectionId ? { sectionId: query.sectionId } : {}),
          },
        },
        include: {
          student: { include: { class: true, section: true } },
          feeHead: true,
          receipt: true,
          recordedBy: true,
        },
        orderBy: { createdAt: "desc" },
      });

      let cashTotal = 0;
      let upiTotal = 0;
      let bankTotal = 0;

      const transactions = payments.map((p) => {
        if (p.method === "cash") cashTotal += p.amount;
        else if (p.method === "upi") upiTotal += p.amount;
        else if (p.method === "bank") bankTotal += p.amount;

        return {
          id: p.id,
          receiptNumber: p.receipt?.number ?? "-",
          date: p.createdAt.toISOString().slice(0, 10),
          createdAt: p.createdAt.toISOString(),
          studentId: p.studentId,
          admissionNumber: p.student.admissionNumber,
          studentName: p.student.fullName,
          className: p.student.class.name,
          sectionName: p.student.section.name,
          feeHeadName: p.feeHead.name,
          amount: p.amount,
          method: p.method,
          note: p.note,
          recordedByName: p.recordedBy.displayName,
        };
      });

      const totalAmount = cashTotal + upiTotal + bankTotal;

      return {
        summary: {
          transactionCount: transactions.length,
          totalAmount,
          cashTotal,
          upiTotal,
          bankTotal,
          from: query.from ?? null,
          to: query.to ?? null,
        },
        transactions,
      };
    });
  }

  async exportPaymentsCsv(acl: RequestAcl, query: PaymentReportQuery): Promise<string> {
    const report = await this.getPaymentReport(acl, query);
    return formatPaymentsCsv(report);
  }

  async getStudentListReport(acl: RequestAcl, query: StudentListReportQuery) {
    this.policy.assertCanAccessStudentsReport(acl);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const isSchoolScope = this.policy.hasSchoolScope(acl);
      const allowedSectionIds = this.policy.getAllowedSectionIds(acl);
      const allowedClassIds = this.policy.getAllowedClassIds(acl);

      if (!isSchoolScope) {
        if (query.sectionId && !allowedSectionIds.includes(query.sectionId)) {
          throw new ForbiddenException("You cannot access student reports for this section");
        }
        if (query.classId && !allowedClassIds.includes(query.classId)) {
          throw new ForbiddenException("You cannot access student reports for this class");
        }
        if (allowedSectionIds.length === 0 && allowedClassIds.length === 0) {
          throw new ForbiddenException("No sections or classes assigned to your account");
        }
      }

      await this.validateClassAndSection(tx, acl.schoolId, query.classId, query.sectionId);

      const students = await tx.student.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(query.status ? { status: query.status } : {}),
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.sectionId ? { sectionId: query.sectionId } : {}),
          ...(!isSchoolScope && !query.sectionId
            ? { sectionId: { in: allowedSectionIds } }
            : {}),
        },
        include: {
          class: true,
          section: true,
          parents: {
            include: { parent: true },
          },
        },
        orderBy: [
          { class: { name: "asc" } },
          { section: { name: "asc" } },
          { admissionNumber: "asc" },
        ],
      });

      let activeCount = 0;
      let inactiveCount = 0;

      const rows = students.map((s) => {
        if (s.status === "active") activeCount += 1;
        else inactiveCount += 1;

        const primaryParent = s.parents[0]?.parent;
        return {
          id: s.id,
          admissionNumber: s.admissionNumber,
          fullName: s.fullName,
          className: s.class.name,
          sectionName: s.section.name,
          status: s.status,
          parentName: primaryParent?.fullName ?? null,
          parentContact: primaryParent?.contact ?? null,
        };
      });

      return {
        summary: {
          totalStudents: rows.length,
          activeCount,
          inactiveCount,
        },
        students: rows,
      };
    });
  }

  async exportStudentListCsv(acl: RequestAcl, query: StudentListReportQuery): Promise<string> {
    const report = await this.getStudentListReport(acl, query);
    return formatStudentListCsv(report);
  }

  async getTeacherWorkloadReport(acl: RequestAcl, query: TeacherWorkloadReportQuery) {
    this.policy.assertCanAccessTeacherWorkload(acl);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      if (query.teacherId) {
        const exists = await tx.teacher.findFirst({
          where: { id: query.teacherId, schoolId: acl.schoolId },
        });
        if (!exists) throw new NotFoundException("Teacher not found");
      }

      const teachers = await tx.teacher.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(query.teacherId ? { id: query.teacherId } : {}),
        },
        include: {
          timetablePeriods: {
            where: { schoolId: acl.schoolId },
            include: {
              section: { include: { class: true } },
              subject: true,
            },
          },
        },
        orderBy: { fullName: "asc" },
      });

      let totalPeriodsScheduled = 0;

      const rows = teachers.map((t) => {
        const sectionSet = new Set<string>();
        const subjectSet = new Set<string>();

        for (const p of t.timetablePeriods) {
          sectionSet.add(`${p.section.class.name}-${p.section.name}`);
          subjectSet.add(p.subject.name);
        }

        const weeklyPeriodsCount = t.timetablePeriods.length;
        totalPeriodsScheduled += weeklyPeriodsCount;

        return {
          id: t.id,
          employeeId: t.employeeId,
          fullName: t.fullName,
          assignedSections: Array.from(sectionSet).sort(),
          assignedSubjects: Array.from(subjectSet).sort(),
          weeklyPeriodsCount,
        };
      });

      const averagePeriodsPerTeacher =
        rows.length > 0 ? Number((totalPeriodsScheduled / rows.length).toFixed(1)) : 0;

      return {
        summary: {
          totalTeachers: rows.length,
          totalPeriodsScheduled,
          averagePeriodsPerTeacher,
        },
        teachers: rows,
      };
    });
  }

  async exportTeacherWorkloadCsv(
    acl: RequestAcl,
    query: TeacherWorkloadReportQuery,
  ): Promise<string> {
    const report = await this.getTeacherWorkloadReport(acl, query);
    return formatTeacherWorkloadCsv(report);
  }

  async getProgressReport(acl: RequestAcl, query: ProgressReportQuery) {
    this.policy.assertCanAccessProgressReport(acl);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const isSchoolScope = this.policy.hasSchoolScope(acl);
      const allowedSectionIds = this.policy.getAllowedSectionIds(acl);
      const allowedClassIds = this.policy.getAllowedClassIds(acl);

      if (!isSchoolScope) {
        if (query.sectionId && !allowedSectionIds.includes(query.sectionId)) {
          throw new ForbiddenException("You cannot access progress reports for this section");
        }
        if (query.classId && !allowedClassIds.includes(query.classId)) {
          throw new ForbiddenException("You cannot access progress reports for this class");
        }
        if (allowedSectionIds.length === 0 && allowedClassIds.length === 0) {
          throw new ForbiddenException("No sections or classes assigned to your account");
        }
      }

      await this.validateClassAndSection(tx, acl.schoolId, query.classId, query.sectionId);

      const exams = await tx.exam.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(query.examId ? { id: query.examId } : {}),
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.sectionId ? { sectionId: query.sectionId } : {}),
          ...(!isSchoolScope && !query.sectionId
            ? { sectionId: { in: allowedSectionIds } }
            : {}),
        },
        include: {
          subject: true,
          class: true,
          section: true,
        },
        orderBy: { name: "asc" },
      });

      if (exams.length === 0) {
        return {
          summary: { examCount: 0, studentCount: 0, averagePercentage: 0 },
          subjects: [],
          rows: [],
        };
      }

      const examIds = exams.map((e) => e.id);
      const marks = await tx.mark.findMany({
        where: {
          schoolId: acl.schoolId,
          status: "published",
          examId: { in: examIds },
          ...(query.studentId ? { studentId: query.studentId } : {}),
        },
        include: {
          student: { include: { class: true, section: true } },
          exam: { include: { subject: true } },
        },
      });

      const subjectSet = new Set<string>();
      for (const e of exams) {
        subjectSet.add(e.subject.name);
      }
      const subjects = Array.from(subjectSet).sort();

      const studentMap = new Map<
        string,
        {
          student: {
            id: string;
            admissionNumber: string;
            fullName: string;
            className: string;
            sectionName: string;
          };
          scores: Record<string, number | null>;
          totalScore: number;
          maxScore: number;
        }
      >();

      for (const m of marks) {
        let entry = studentMap.get(m.studentId);
        if (!entry) {
          entry = {
            student: {
              id: m.student.id,
              admissionNumber: m.student.admissionNumber,
              fullName: m.student.fullName,
              className: m.student.class.name,
              sectionName: m.student.section.name,
            },
            scores: {},
            totalScore: 0,
            maxScore: 0,
          };
          for (const s of subjects) {
            entry.scores[s] = null;
          }
          studentMap.set(m.studentId, entry);
        }

        entry.scores[m.exam.subject.name] = m.score;
        entry.totalScore += m.score;
        entry.maxScore += m.exam.maxScore;
      }

      const rows = Array.from(studentMap.values())
        .map((e) => {
          const percentage = e.maxScore > 0 ? (e.totalScore / e.maxScore) * 100 : 0;
          return {
            studentId: e.student.id,
            admissionNumber: e.student.admissionNumber,
            studentName: e.student.fullName,
            className: e.student.className,
            sectionName: e.student.sectionName,
            scores: e.scores,
            totalScore: e.totalScore,
            maxScore: e.maxScore,
            percentage: Number(percentage.toFixed(1)),
          };
        })
        .sort((a, b) => a.admissionNumber.localeCompare(b.admissionNumber));

      const totalPercentageSum = rows.reduce((acc, r) => acc + r.percentage, 0);
      const averagePercentage = rows.length > 0 ? Number((totalPercentageSum / rows.length).toFixed(1)) : 0;

      return {
        summary: {
          examCount: exams.length,
          studentCount: rows.length,
          averagePercentage,
        },
        subjects,
        rows,
      };
    });
  }

  async exportProgressCsv(acl: RequestAcl, query: ProgressReportQuery): Promise<string> {
    const report = await this.getProgressReport(acl, query);
    return formatProgressTabulationCsv(report);
  }

  private async validateClassAndSection(
    tx: import("@prisma/client").Prisma.TransactionClient,
    schoolId: string,
    classId?: string,
    sectionId?: string,
  ) {
    if (classId) {
      const cls = await tx.class.findFirst({
        where: { id: classId, schoolId },
      });
      if (!cls) throw new NotFoundException("Class not found");
    }

    if (sectionId) {
      const sec = await tx.section.findFirst({
        where: { id: sectionId, schoolId },
      });
      if (!sec) throw new NotFoundException("Section not found");

      if (classId && sec.classId !== classId) {
        throw new BadRequestException("Section does not belong to the specified class");
      }
    }
  }
}
