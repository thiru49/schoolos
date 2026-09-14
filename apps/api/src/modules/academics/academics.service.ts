import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@schoolos/permissions";
import {
  academicYearCreateSchema,
  academicYearUpdateSchema,
  classCreateSchema,
  classUpdateSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
} from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { AcademicsPolicy } from "./academics.policy";

@Injectable()
export class AcademicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: AcademicsPolicy,
  ) {}

  private parseOrBadRequest<T>(schema: { parse: (val: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err: unknown) {
      const zodErr = err as { issues?: { message: string }[]; message?: string };
      const msg =
        zodErr?.issues?.map((i) => i.message).join("; ") || zodErr?.message || "Validation failed";
      throw new BadRequestException(msg);
    }
  }

  private async audit(
    tx: Prisma.TransactionClient,
    acl: RequestAcl,
    action: string,
    resource: string,
    resourceId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await tx.auditLog.create({
      data: {
        schoolId: acl.schoolId,
        actorUserId: acl.userId,
        action,
        resource,
        resourceId,
        metadata,
      },
    });
  }

  sections(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const sections = await tx.section.findMany({
        where: { schoolId: acl.schoolId },
        include: { class: true },
        orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      });
      const schoolWide = acl.scopes.some((s) => s.type === "school");
      const allowed = new Set(
        acl.scopes.filter((s) => s.type === "section" && s.sectionId).map((s) => s.sectionId),
      );
      const filtered = schoolWide ? sections : sections.filter((s) => allowed.has(s.id));
      return filtered.map((s) => ({
        id: s.id,
        name: s.name,
        classId: s.classId,
        className: s.class.name,
        label: `${s.class.name}-${s.name}`,
      }));
    });
  }

  listAcademicYears(acl: RequestAcl) {
    this.policy.assertReadAcademicYears(acl);
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.academicYear
        .findMany({
          where: { schoolId: acl.schoolId },
          orderBy: [{ isActive: "desc" }, { name: "desc" }],
        })
        .then((rows) =>
          rows.map((y) => ({
            id: y.id,
            name: y.name,
            isActive: y.isActive,
          })),
        ),
    );
  }

  createAcademicYear(acl: RequestAcl, body: unknown) {
    this.policy.assertManageAcademicYear(acl);
    const input = this.parseOrBadRequest(academicYearCreateSchema, body);
    const isActive = input.isActive ?? false;
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      if (isActive) {
        await tx.academicYear.updateMany({
          where: { schoolId: acl.schoolId, isActive: true },
          data: { isActive: false },
        });
      }
      const year = await tx.academicYear.create({
        data: {
          schoolId: acl.schoolId,
          name: input.name,
          isActive,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.ACADEMIC_YEAR_MANAGE, "academic_year", year.id, {
        name: year.name,
        isActive: year.isActive,
      });
      return { id: year.id, name: year.name, isActive: year.isActive };
    });
  }

  updateAcademicYear(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertManageAcademicYear(acl);
    const input = this.parseOrBadRequest(academicYearUpdateSchema, body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.academicYear.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Academic year not found");

      if (input.isActive === true) {
        await tx.academicYear.updateMany({
          where: { schoolId: acl.schoolId, isActive: true, id: { not: id } },
          data: { isActive: false },
        });
      }

      const updated = await tx.academicYear.update({
        where: { id, schoolId: acl.schoolId },
        data: {
          name: input.name,
          isActive: input.isActive,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.ACADEMIC_YEAR_MANAGE, "academic_year", updated.id, {
        name: updated.name,
        isActive: updated.isActive,
      });
      return { id: updated.id, name: updated.name, isActive: updated.isActive };
    });
  }

  removeAcademicYear(acl: RequestAcl, id: string) {
    this.policy.assertManageAcademicYear(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.academicYear.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Academic year not found");

      const classCount = await tx.class.count({
        where: { schoolId: acl.schoolId, academicYearId: id },
      });
      if (classCount > 0) {
        throw new ConflictException("Cannot delete academic year with existing classes");
      }

      await tx.academicYear.delete({ where: { id, schoolId: acl.schoolId } });
      await this.audit(tx, acl, PERMISSIONS.ACADEMIC_YEAR_MANAGE, "academic_year", id, {
        deleted: true,
        name: existing.name,
      });
      return { deleted: true };
    });
  }

  listClasses(acl: RequestAcl, academicYearId?: string) {
    this.policy.assertManageClasses(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const where: Prisma.ClassWhereInput = { schoolId: acl.schoolId };
      if (academicYearId) {
        const year = await tx.academicYear.findFirst({
          where: { id: academicYearId, schoolId: acl.schoolId },
        });
        if (!year) throw new NotFoundException("Academic year not found");
        where.academicYearId = academicYearId;
      }
      const rows = await tx.class.findMany({
        where,
        include: {
          academicYear: true,
          sections: { orderBy: { name: "asc" } },
        },
        orderBy: { name: "asc" },
      });
      return rows.map((c) => ({
        id: c.id,
        name: c.name,
        academicYearId: c.academicYearId,
        academicYearName: c.academicYear.name,
        sections: c.sections.map((s) => ({ id: s.id, name: s.name, classId: s.classId })),
      }));
    });
  }

  createClass(acl: RequestAcl, body: unknown) {
    this.policy.assertManageClasses(acl);
    const input = this.parseOrBadRequest(classCreateSchema, body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const year = await tx.academicYear.findFirst({
        where: { id: input.academicYearId, schoolId: acl.schoolId },
      });
      if (!year) throw new BadRequestException("Academic year not found in this school");

      const classRow = await tx.class.create({
        data: {
          schoolId: acl.schoolId,
          academicYearId: input.academicYearId,
          name: input.name,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.CLASSES_MANAGE, "class", classRow.id, {
        name: classRow.name,
        academicYearId: classRow.academicYearId,
      });
      return {
        id: classRow.id,
        name: classRow.name,
        academicYearId: classRow.academicYearId,
        sections: [],
      };
    });
  }

  updateClass(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertManageClasses(acl);
    const input = this.parseOrBadRequest(classUpdateSchema, body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.class.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Class not found");

      if (input.academicYearId) {
        const year = await tx.academicYear.findFirst({
          where: { id: input.academicYearId, schoolId: acl.schoolId },
        });
        if (!year) throw new BadRequestException("Academic year not found in this school");
      }

      const updated = await tx.class.update({
        where: { id, schoolId: acl.schoolId },
        data: {
          name: input.name,
          academicYearId: input.academicYearId,
        },
        include: { sections: { orderBy: { name: "asc" } } },
      });
      await this.audit(tx, acl, PERMISSIONS.CLASSES_MANAGE, "class", updated.id, {
        name: updated.name,
        academicYearId: updated.academicYearId,
      });
      return {
        id: updated.id,
        name: updated.name,
        academicYearId: updated.academicYearId,
        sections: updated.sections.map((s) => ({
          id: s.id,
          name: s.name,
          classId: s.classId,
        })),
      };
    });
  }

  removeClass(acl: RequestAcl, id: string) {
    this.policy.assertManageClasses(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.class.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Class not found");

      const studentCount = await tx.student.count({
        where: { schoolId: acl.schoolId, classId: id },
      });
      if (studentCount > 0) {
        throw new ConflictException("Cannot delete class with enrolled students");
      }

      await tx.class.delete({ where: { id, schoolId: acl.schoolId } });
      await this.audit(tx, acl, PERMISSIONS.CLASSES_MANAGE, "class", id, {
        deleted: true,
        name: existing.name,
      });
      return { deleted: true };
    });
  }

  createSection(acl: RequestAcl, body: unknown) {
    this.policy.assertManageClasses(acl);
    const input = this.parseOrBadRequest(sectionCreateSchema, body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const classRow = await tx.class.findFirst({
        where: { id: input.classId, schoolId: acl.schoolId },
      });
      if (!classRow) throw new BadRequestException("Class not found in this school");

      const section = await tx.section.create({
        data: {
          schoolId: acl.schoolId,
          classId: input.classId,
          name: input.name,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.CLASSES_MANAGE, "section", section.id, {
        name: section.name,
        classId: section.classId,
      });
      return { id: section.id, name: section.name, classId: section.classId };
    });
  }

  updateSection(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertManageClasses(acl);
    const input = this.parseOrBadRequest(sectionUpdateSchema, body);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.section.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Section not found");

      if (input.classId) {
        const classRow = await tx.class.findFirst({
          where: { id: input.classId, schoolId: acl.schoolId },
        });
        if (!classRow) throw new BadRequestException("Class not found in this school");
      }

      const updated = await tx.section.update({
        where: { id, schoolId: acl.schoolId },
        data: {
          name: input.name,
          classId: input.classId,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.CLASSES_MANAGE, "section", updated.id, {
        name: updated.name,
        classId: updated.classId,
      });
      return { id: updated.id, name: updated.name, classId: updated.classId };
    });
  }

  removeSection(acl: RequestAcl, id: string) {
    this.policy.assertManageClasses(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.section.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Section not found");

      const studentCount = await tx.student.count({
        where: { schoolId: acl.schoolId, sectionId: id },
      });
      if (studentCount > 0) {
        throw new ConflictException("Cannot delete section with enrolled students");
      }

      await tx.section.delete({ where: { id, schoolId: acl.schoolId } });
      await this.audit(tx, acl, PERMISSIONS.CLASSES_MANAGE, "section", id, {
        deleted: true,
        name: existing.name,
        classId: existing.classId,
      });
      return { deleted: true };
    });
  }

  listSubjects(acl: RequestAcl) {
    this.policy.assertManageSubjects(acl);
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.subject.findMany({
        where: { schoolId: acl.schoolId },
        orderBy: { name: "asc" },
      }),
    );
  }

  listSubjectsForTimetable(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, (tx) =>
      tx.subject.findMany({
        where: { schoolId: acl.schoolId },
        orderBy: { name: "asc" },
      }),
    );
  }

  async createSubject(acl: RequestAcl, body: unknown) {
    this.policy.assertManageSubjects(acl);
    const input = this.parseOrBadRequest(subjectCreateSchema, body);
    try {
      return await this.prisma.withSchool(acl.schoolId, async (tx) => {
        const subject = await tx.subject.create({
          data: { schoolId: acl.schoolId, name: input.name },
        });
        await this.audit(tx, acl, PERMISSIONS.SUBJECTS_MANAGE, "subject", subject.id, {
          name: subject.name,
        });
        return { id: subject.id, name: subject.name };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Subject name already exists in this school");
      }
      throw e;
    }
  }

  async updateSubject(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertManageSubjects(acl);
    const input = this.parseOrBadRequest(subjectUpdateSchema, body);
    try {
      return await this.prisma.withSchool(acl.schoolId, async (tx) => {
        const existing = await tx.subject.findFirst({
          where: { id, schoolId: acl.schoolId },
        });
        if (!existing) throw new NotFoundException("Subject not found");

        const updated = await tx.subject.update({
          where: { id, schoolId: acl.schoolId },
          data: { name: input.name },
        });
        await this.audit(tx, acl, PERMISSIONS.SUBJECTS_MANAGE, "subject", updated.id, {
          name: updated.name,
        });
        return { id: updated.id, name: updated.name };
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("Subject name already exists in this school");
      }
      throw e;
    }
  }

  removeSubject(acl: RequestAcl, id: string) {
    this.policy.assertManageSubjects(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.subject.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) throw new NotFoundException("Subject not found");

      const timetableCount = await tx.timetablePeriod.count({
        where: { schoolId: acl.schoolId, subjectId: id },
      });
      const examCount = await tx.exam.count({
        where: { schoolId: acl.schoolId, subjectId: id },
      });
      if (timetableCount > 0 || examCount > 0) {
        throw new ConflictException("Cannot delete subject used in timetable or exams");
      }

      await tx.subject.delete({ where: { id, schoolId: acl.schoolId } });
      await this.audit(tx, acl, PERMISSIONS.SUBJECTS_MANAGE, "subject", id, {
        deleted: true,
        name: existing.name,
      });
      return { deleted: true };
    });
  }
}
