import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AttendanceStatus } from "@schoolos/permissions";

@Injectable()
export class AttendanceRepository {
  findSection(tx: Prisma.TransactionClient, schoolId: string, sectionId: string) {
    return tx.section.findFirst({
      where: { id: sectionId, schoolId },
      include: { class: true },
    });
  }

  listSectionStudents(tx: Prisma.TransactionClient, schoolId: string, sectionId: string) {
    return tx.student.findMany({
      where: { schoolId, sectionId, status: "active" },
      orderBy: { admissionNumber: "asc" },
    });
  }

  listForSectionDate(
    tx: Prisma.TransactionClient,
    schoolId: string,
    sectionId: string,
    date: Date,
  ) {
    return tx.attendance.findMany({
      where: { schoolId, sectionId, date },
    });
  }

  listForStudent(
    tx: Prisma.TransactionClient,
    schoolId: string,
    studentId: string,
    from?: Date,
    to?: Date,
  ) {
    return tx.attendance.findMany({
      where: {
        schoolId,
        studentId,
        ...(from || to
          ? { date: { gte: from, lte: to } }
          : {}),
      },
      include: { student: true },
      orderBy: { date: "desc" },
    });
  }

  findStudent(tx: Prisma.TransactionClient, schoolId: string, studentId: string) {
    return tx.student.findFirst({ where: { id: studentId, schoolId } });
  }

  linkedChildIds(tx: Prisma.TransactionClient, schoolId: string, userId: string) {
    return tx.parent.findFirst({
      where: { schoolId, userId },
      include: { children: true },
    });
  }

  listRange(
    tx: Prisma.TransactionClient,
    schoolId: string,
    sectionId: string,
    from: Date,
    to: Date,
  ) {
    return tx.attendance.findMany({
      where: { schoolId, sectionId, date: { gte: from, lte: to } },
    });
  }

  upsertMarks(
    tx: Prisma.TransactionClient,
    schoolId: string,
    markedByUserId: string,
    sectionId: string,
    date: Date,
    marks: { studentId: string; status: AttendanceStatus }[],
  ) {
    return Promise.all(
      marks.map((m) =>
        tx.attendance.upsert({
          where: {
            schoolId_studentId_date: { schoolId, studentId: m.studentId, date },
          },
          update: { status: m.status, markedByUserId, sectionId },
          create: {
            schoolId,
            studentId: m.studentId,
            sectionId,
            date,
            status: m.status,
            markedByUserId,
          },
        }),
      ),
    );
  }
}
