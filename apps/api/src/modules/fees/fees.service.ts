import { Injectable, NotFoundException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { feeHeadCreateSchema, feeRecordSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { FeesPolicy } from "./fees.policy";

@Injectable()
export class FeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: FeesPolicy,
  ) {}

  listHeads(acl: RequestAcl) {
    this.policy.assertRead(acl);
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.feeHead.findMany({ where: { schoolId: acl.schoolId }, orderBy: { name: "asc" } }),
    );
  }

  createHead(acl: RequestAcl, body: unknown) {
    this.policy.assertStructure(acl);
    const input = feeHeadCreateSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.feeHead.create({ data: { schoolId: acl.schoolId, name: input.name, amount: input.amount } }),
    );
  }

  async list(acl: RequestAcl, studentId?: string) {
    this.policy.assertRead(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const linked = await this.linkedChildIds(tx, acl);
      let target = studentId;
      if (!target && acl.scopes.some((s) => s.type === "self")) {
        const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
        target = me?.id;
      }
      if (target) this.policy.assertCanSeeStudent(acl, target, linked);
      else if (!acl.scopes.some((s) => s.type === "school")) {
        target = linked[0];
        if (!target) return [];
      }
      const rows = await tx.feePayment.findMany({
        where: {
          schoolId: acl.schoolId,
          ...(target ? { studentId: target } : {}),
        },
        include: { student: true, feeHead: true, receipt: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map(toDto);
    });
  }

  record(acl: RequestAcl, body: unknown) {
    this.policy.assertRecord(acl);
    const input = feeRecordSchema.parse(body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: input.studentId, schoolId: acl.schoolId },
      });
      if (!student) throw new NotFoundException("Student not found");
      const head = await tx.feeHead.findFirst({
        where: { id: input.feeHeadId, schoolId: acl.schoolId },
      });
      if (!head) throw new NotFoundException("Fee head not found");
      const school = await tx.school.findFirstOrThrow({ where: { id: acl.schoolId } });
      const last = await tx.receipt.findFirst({
        where: { schoolId: acl.schoolId },
        orderBy: { seq: "desc" },
      });
      const seq = (last?.seq ?? 0) + 1;
      const number = `${school.receiptPrefix}/${seq}`;
      const payment = await tx.feePayment.create({
        data: {
          schoolId: acl.schoolId,
          studentId: student.id,
          feeHeadId: head.id,
          amount: input.amount,
          method: input.method,
          note: input.note,
          recordedByUserId: acl.userId,
        },
      });
      await tx.receipt.create({
        data: {
          schoolId: acl.schoolId,
          paymentId: payment.id,
          seq,
          number,
        },
      });
      await tx.auditLog.create({
        data: {
          schoolId: acl.schoolId,
          actorUserId: acl.userId,
          action: PERMISSIONS.FEES_RECORD,
          resource: "fee_payment",
          resourceId: payment.id,
          metadata: { number, method: input.method, amount: input.amount },
        },
      });
      const full = await tx.feePayment.findFirstOrThrow({
        where: { id: payment.id },
        include: { student: true, feeHead: true, receipt: true },
      });
      return toDto(full);
    });
  }

  getReceipt(acl: RequestAcl, id: string) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const receipt = await tx.receipt.findFirst({
        where: { id, schoolId: acl.schoolId },
        include: { payment: { include: { student: true, feeHead: true } } },
      });
      if (!receipt) throw new NotFoundException("Receipt not found");
      const linked = await this.linkedChildIds(tx, acl);
      this.policy.assertCanSeeStudent(acl, receipt.payment.studentId, linked);
      return {
        id: receipt.id,
        number: receipt.number,
        amount: receipt.payment.amount,
        method: receipt.payment.method,
        note: receipt.payment.note,
        feeHead: receipt.payment.feeHead.name,
        studentName: receipt.payment.student.fullName,
        admissionNumber: receipt.payment.student.admissionNumber,
        createdAt: receipt.payment.createdAt.toISOString(),
      };
    });
  }

  previewNumber(acl: RequestAcl) {
    this.policy.assertRecord(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const school = await tx.school.findFirstOrThrow({ where: { id: acl.schoolId } });
      const last = await tx.receipt.findFirst({
        where: { schoolId: acl.schoolId },
        orderBy: { seq: "desc" },
      });
      const seq = (last?.seq ?? 0) + 1;
      return { preview: `${school.receiptPrefix}/${seq}` };
    });
  }

  private async linkedChildIds(tx: import("@prisma/client").Prisma.TransactionClient, acl: RequestAcl) {
    const parent = await tx.parent.findFirst({
      where: { schoolId: acl.schoolId, userId: acl.userId },
      include: { children: true },
    });
    return parent?.children.map((c) => c.studentId) ?? [];
  }
}

function toDto(p: {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  createdAt: Date;
  student: { id: string; fullName: string; admissionNumber: string };
  feeHead: { id: string; name: string };
  receipt: { id: string; number: string } | null;
}) {
  return {
    id: p.id,
    amount: p.amount,
    method: p.method,
    note: p.note,
    createdAt: p.createdAt.toISOString(),
    studentId: p.student.id,
    studentName: p.student.fullName,
    admissionNumber: p.student.admissionNumber,
    feeHeadId: p.feeHead.id,
    feeHeadName: p.feeHead.name,
    receiptId: p.receipt?.id ?? null,
    receiptNumber: p.receipt?.number ?? null,
  };
}
