import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@schoolos/permissions";
import { feeHeadCreateSchema, feeRecordSchema } from "@schoolos/validation";
import { z } from "zod";
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

  async createHead(acl: RequestAcl, body: unknown) {
    this.policy.assertStructure(acl);
    const parsed = feeHeadCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const input = parsed.data;
    try {
      return await this.prisma.withSchool(acl.schoolId, (tx) =>
        tx.feeHead.create({ data: { schoolId: acl.schoolId, name: input.name, amount: input.amount } }),
      );
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Fee head name already exists in this school");
      }
      throw e;
    }
  }

  async list(acl: RequestAcl, studentId?: string) {
    this.policy.assertRead(acl);
    if (studentId && !z.string().uuid().safeParse(studentId).success) {
      throw new BadRequestException("studentId is required");
    }
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const linked = await this.linkedChildIds(tx, acl);
      let target = studentId;
      if (!target && acl.scopes.some((s) => s.type === "self")) {
        const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
        target = me?.id;
      }
      if (target) this.policy.assertCanSeeStudent(acl, target, linked);
      else if (!acl.scopes.some((s) => s.type === "school")) {
        throw new BadRequestException("studentId is required");
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
    const parsed = feeRecordSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues.map((i) => i.message).join("; "));
    }
    const input = parsed.data;
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: input.studentId, schoolId: acl.schoolId },
      });
      if (!student) throw new NotFoundException("Student not found");
      const head = await tx.feeHead.findFirst({
        where: { id: input.feeHeadId, schoolId: acl.schoolId },
      });
      if (!head) throw new NotFoundException("Fee head not found");
      const { seq, number } = await allocateReceiptNumber(tx, acl.schoolId);
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
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) throw new NotFoundException("Receipt not found");
    this.policy.assertReceiptRead(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const receipt = await tx.receipt.findFirst({
        where: { id: parsed.data, schoolId: acl.schoolId },
        include: { payment: { include: { student: true, feeHead: true } } },
      });
      if (!receipt) throw new NotFoundException("Receipt not found");
      const linked = await this.linkedChildIds(tx, acl);
      this.policy.assertCanSeeReceipt(acl, receipt.payment.studentId, linked);
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

  /**
   * FEE-007: fetch receipt data enriched with school branding for PDF rendering.
   * Same RBAC as getReceipt() — assertReceiptRead + assertCanSeeReceipt.
   */
  getReceiptForPdf(acl: RequestAcl, id: string) {
    const parsed = z.string().uuid().safeParse(id);
    if (!parsed.success) throw new NotFoundException("Receipt not found");
    this.policy.assertReceiptRead(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const receipt = await tx.receipt.findFirst({
        where: { id: parsed.data, schoolId: acl.schoolId },
        include: { payment: { include: { student: true, feeHead: true } } },
      });
      if (!receipt) throw new NotFoundException("Receipt not found");
      const linked = await this.linkedChildIds(tx, acl);
      this.policy.assertCanSeeReceipt(acl, receipt.payment.studentId, linked);
      const school = await tx.school.findFirstOrThrow({ where: { id: acl.schoolId } });
      return {
        schoolName: school.name,
        logoUrl: school.logoUrl,
        typography: school.typography as { families?: { display?: string; body?: string; tamil?: string } } | null,
        receiptNumber: receipt.number,
        createdAt: receipt.payment.createdAt.toISOString(),
        studentName: receipt.payment.student.fullName,
        admissionNumber: receipt.payment.student.admissionNumber,
        feeHead: receipt.payment.feeHead.name,
        amount: receipt.payment.amount,
        method: receipt.payment.method,
        note: receipt.payment.note,
      };
    });
  }

  async summary(acl: RequestAcl, studentId?: string) {
    this.policy.assertRead(acl);
    if (studentId && !z.string().uuid().safeParse(studentId).success) {
      throw new BadRequestException("studentId is required");
    }
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const linked = await this.linkedChildIds(tx, acl);
      let target = studentId;
      if (!target && acl.scopes.some((s) => s.type === "self")) {
        const me = await tx.student.findFirst({ where: { schoolId: acl.schoolId, userId: acl.userId } });
        target = me?.id;
      }
      if (!target) throw new BadRequestException("studentId is required");
      this.policy.assertCanSeeStudent(acl, target, linked);
      const student = await tx.student.findFirst({
        where: { id: target, schoolId: acl.schoolId },
      });
      if (!student) throw new NotFoundException("Student not found");
      const [heads, paid] = await Promise.all([
        tx.feeHead.aggregate({ where: { schoolId: acl.schoolId }, _sum: { amount: true } }),
        tx.feePayment.aggregate({
          where: { schoolId: acl.schoolId, studentId: target },
          _sum: { amount: true },
        }),
      ]);
      const headsTotal = heads._sum.amount ?? 0;
      const paidTotal = paid._sum.amount ?? 0;
      return {
        studentId: student.id,
        studentName: student.fullName,
        headsTotal,
        paidTotal,
        dues: Math.max(0, headsTotal - paidTotal),
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

async function allocateReceiptNumber(
  tx: import("@prisma/client").Prisma.TransactionClient,
  schoolId: string,
) {
  const locked = await tx.$queryRaw<Array<{ receipt_prefix: string }>>`
    SELECT receipt_prefix FROM schools WHERE id = CAST(${schoolId} AS uuid) FOR UPDATE
  `;
  const prefix = locked[0]?.receipt_prefix;
  if (!prefix) throw new NotFoundException("School not found");
  const last = await tx.receipt.findFirst({
    where: { schoolId },
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  const seq = (last?.seq ?? 0) + 1;
  return { seq, number: `${prefix}/${seq}` };
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
