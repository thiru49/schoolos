import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import {
  eventCreateSchema,
  eventQuerySchema,
  eventUpdateSchema,
  holidayCreateSchema,
  noticeCreateSchema,
  noticeUpdateSchema,
} from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { CommunicationsPolicy } from "./communications.policy";

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: CommunicationsPolicy,
  ) {}

  private isStaff(acl: RequestAcl): boolean {
    return acl.roles.some((r) =>
      ["school_super_admin", "school_admin", "academic_admin", "accounts_admin"].includes(r),
    );
  }

  private parseOrBadRequest<T>(schema: { parse: (val: unknown) => T }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (err: any) {
      const msg = err?.issues?.map((i: any) => i.message).join("; ") || err?.message || "Validation failed";
      throw new BadRequestException(msg);
    }
  }

  // --- NOTICES ---

  listNotices(acl: RequestAcl) {
    this.policy.assertReadNotices(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const isStaff = this.isStaff(acl);
      const where: Prisma.NoticeWhereInput = {
        schoolId: acl.schoolId,
      };

      if (!isStaff) {
        where.published = true;
        where.OR = [
          { targetRole: null },
          { targetRole: "all" },
          { targetRole: { in: acl.roles } },
        ];
      }

      const rows = await tx.notice.findMany({
        where,
        include: {
          author: {
            select: { id: true, displayName: true },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      });

      return rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        targetRole: n.targetRole,
        published: n.published,
        publishedAt: n.publishedAt ? n.publishedAt.toISOString() : null,
        authorId: n.authorId,
        authorName: n.author.displayName,
        createdAt: n.createdAt.toISOString(),
      }));
    });
  }

  createNotice(acl: RequestAcl, body: unknown) {
    this.policy.assertWriteNotices(acl);
    const input = this.parseOrBadRequest(noticeCreateSchema, body);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const targetRole = input.targetRole === "all" ? null : (input.targetRole ?? null);
      const published = input.published ?? true;
      const publishedAt = published ? new Date() : null;

      const notice = await tx.notice.create({
        data: {
          schoolId: acl.schoolId,
          authorId: acl.userId,
          title: input.title,
          body: input.body,
          targetRole,
          published,
          publishedAt,
        },
        include: {
          author: {
            select: { id: true, displayName: true },
          },
        },
      });

      return {
        id: notice.id,
        title: notice.title,
        body: notice.body,
        targetRole: notice.targetRole,
        published: notice.published,
        publishedAt: notice.publishedAt ? notice.publishedAt.toISOString() : null,
        authorId: notice.authorId,
        authorName: notice.author.displayName,
        createdAt: notice.createdAt.toISOString(),
      };
    });
  }

  updateNotice(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertWriteNotices(acl);
    const input = this.parseOrBadRequest(noticeUpdateSchema, body);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.notice.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) {
        throw new NotFoundException("Notice not found");
      }

      const data: Prisma.NoticeUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.body !== undefined) data.body = input.body;
      if (input.targetRole !== undefined) {
        data.targetRole = input.targetRole === "all" ? null : input.targetRole;
      }
      if (input.published !== undefined) {
        data.published = input.published;
        if (input.published && !existing.published) {
          // Transition draft -> published: set actual publication timestamp
          data.publishedAt = new Date();
        } else if (!input.published && existing.published) {
          // Transition published -> draft (unpublishing): explicitly reset publishedAt to null
          data.publishedAt = null;
        }
      }

      const updated = await tx.notice.update({
        where: { id, schoolId: acl.schoolId },
        data,
        include: {
          author: {
            select: { id: true, displayName: true },
          },
        },
      });

      return {
        id: updated.id,
        title: updated.title,
        body: updated.body,
        targetRole: updated.targetRole,
        published: updated.published,
        publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
        authorId: updated.authorId,
        authorName: updated.author.displayName,
        createdAt: updated.createdAt.toISOString(),
      };
    });
  }

  removeNotice(acl: RequestAcl, id: string) {
    this.policy.assertWriteNotices(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.notice.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) {
        throw new NotFoundException("Notice not found");
      }

      await tx.notice.delete({
        where: { id, schoolId: acl.schoolId },
      });

      return { deleted: true };
    });
  }

  // --- EVENTS ---

  listEvents(acl: RequestAcl, from?: string, to?: string) {
    this.policy.assertReadEvents(acl);
    const query = this.parseOrBadRequest(eventQuerySchema, {
      from: from ? from.trim() : undefined,
      to: to ? to.trim() : undefined,
    });

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const isStaff = this.isStaff(acl);
      const where: Prisma.EventWhereInput = {
        schoolId: acl.schoolId,
      };

      if (!isStaff) {
        where.published = true;
      }

      if (query.from || query.to) {
        where.startDate = {
          ...(query.from ? { gte: new Date(query.from) } : {}),
          ...(query.to ? { lte: new Date(query.to) } : {}),
        };
      }

      const rows = await tx.event.findMany({
        where,
        orderBy: { startDate: "asc" },
      });

      return rows.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate.toISOString(),
        location: e.location,
        published: e.published,
        createdAt: e.createdAt.toISOString(),
      }));
    });
  }

  createEvent(acl: RequestAcl, body: unknown) {
    this.policy.assertWriteEvents(acl);
    const input = this.parseOrBadRequest(eventCreateSchema, body);

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (startDate > endDate) {
      throw new BadRequestException("startDate must be before or equal to endDate");
    }

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const event = await tx.event.create({
        data: {
          schoolId: acl.schoolId,
          title: input.title,
          description: input.description ?? null,
          startDate,
          endDate,
          location: input.location ?? null,
          published: input.published ?? true,
        },
      });

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: event.startDate.toISOString(),
        endDate: event.endDate.toISOString(),
        location: event.location,
        published: event.published,
        createdAt: event.createdAt.toISOString(),
      };
    });
  }

  updateEvent(acl: RequestAcl, id: string, body: unknown) {
    this.policy.assertWriteEvents(acl);
    const input = this.parseOrBadRequest(eventUpdateSchema, body);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.event.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) {
        throw new NotFoundException("Event not found");
      }

      const startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
      const endDate = input.endDate ? new Date(input.endDate) : existing.endDate;
      if (startDate > endDate) {
        throw new BadRequestException("startDate must be before or equal to endDate");
      }

      const data: Prisma.EventUpdateInput = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.startDate !== undefined) data.startDate = startDate;
      if (input.endDate !== undefined) data.endDate = endDate;
      if (input.location !== undefined) data.location = input.location;
      if (input.published !== undefined) data.published = input.published;

      const updated = await tx.event.update({
        where: { id, schoolId: acl.schoolId },
        data,
      });

      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate.toISOString(),
        location: updated.location,
        published: updated.published,
        createdAt: updated.createdAt.toISOString(),
      };
    });
  }

  removeEvent(acl: RequestAcl, id: string) {
    this.policy.assertWriteEvents(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.event.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) {
        throw new NotFoundException("Event not found");
      }

      await tx.event.delete({
        where: { id, schoolId: acl.schoolId },
      });

      return { deleted: true };
    });
  }

  // --- HOLIDAYS ---

  listHolidays(acl: RequestAcl, academicYearId?: string) {
    this.policy.assertReadHolidays(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const where: Prisma.HolidayWhereInput = {
        schoolId: acl.schoolId,
        ...(academicYearId ? { academicYearId } : {}),
      };

      const rows = await tx.holiday.findMany({
        where,
        orderBy: { date: "asc" },
      });

      return rows.map((h) => ({
        id: h.id,
        name: h.name,
        date: h.date,
        academicYearId: h.academicYearId,
        createdAt: h.createdAt.toISOString(),
      }));
    });
  }

  createHoliday(acl: RequestAcl, body: unknown) {
    this.policy.assertManageHolidays(acl);
    const input = this.parseOrBadRequest(holidayCreateSchema, body);

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.holiday.findFirst({
        where: { schoolId: acl.schoolId, date: input.date },
      });
      if (existing) {
        throw new BadRequestException("A holiday is already scheduled for this date");
      }

      let academicYearId = input.academicYearId ?? null;
      if (academicYearId) {
        const yr = await tx.academicYear.findFirst({
          where: { id: academicYearId, schoolId: acl.schoolId },
        });
        if (!yr) {
          throw new BadRequestException("Academic year not found in this school");
        }
      } else {
        const activeYear = await tx.academicYear.findFirst({
          where: { schoolId: acl.schoolId, isActive: true },
          select: { id: true },
        });
        academicYearId = activeYear?.id ?? null;
      }

      const holiday = await tx.holiday.create({
        data: {
          schoolId: acl.schoolId,
          name: input.name,
          date: input.date,
          academicYearId,
        },
      });

      return {
        id: holiday.id,
        name: holiday.name,
        date: holiday.date,
        academicYearId: holiday.academicYearId,
        createdAt: holiday.createdAt.toISOString(),
      };
    });
  }

  removeHoliday(acl: RequestAcl, id: string) {
    this.policy.assertManageHolidays(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const existing = await tx.holiday.findFirst({
        where: { id, schoolId: acl.schoolId },
      });
      if (!existing) {
        throw new NotFoundException("Holiday not found");
      }

      await tx.holiday.delete({
        where: { id, schoolId: acl.schoolId },
      });

      return { deleted: true };
    });
  }
}
