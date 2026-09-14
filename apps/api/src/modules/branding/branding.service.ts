import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PERMISSIONS } from "@schoolos/permissions";
import type { BrandingPayload, BrandingTheme, BrandingTypography } from "@schoolos/types";
import { brandingUpdateSchema, schoolSettingsUpdateSchema } from "@schoolos/validation";
import { resolveTypographyUpdate } from "./branding-typography";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { BrandingPolicy } from "./branding.policy";

@Injectable()
export class BrandingService {
  constructor(
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
    private readonly policy: BrandingPolicy,
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

  async publicBySlug(slug: string): Promise<BrandingPayload> {
    const school = await this.tenancy.getSchoolBySlug(slug);
    return this.toPayload(school);
  }

  async getSettings(acl: RequestAcl): Promise<BrandingPayload> {
    this.policy.assertReadSettings(acl);
    const school = await this.prisma.withSchool(acl.schoolId, async (tx) => {
      return tx.school.findUnique({ where: { id: acl.schoolId } });
    });
    if (!school) throw new NotFoundException("School not found");
    return this.toPayload(school);
  }

  async updateSettings(acl: RequestAcl, body: unknown): Promise<BrandingPayload> {
    this.policy.assertUpdateSettings(acl);
    const input = this.parseOrBadRequest(schoolSettingsUpdateSchema, body);

    const school = await this.prisma.withSchool(acl.schoolId, async (tx) => {
      const updated = await tx.school.update({
        where: { id: acl.schoolId },
        data: {
          receiptPrefix: input.receiptPrefix,
          defaultLanguage: input.defaultLanguage,
          attendanceMode: input.attendanceMode,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.SCHOOL_SETTINGS_UPDATE, "school", acl.schoolId, {
        receiptPrefix: input.receiptPrefix,
        defaultLanguage: input.defaultLanguage,
        attendanceMode: input.attendanceMode,
      });
      return updated;
    });
    return this.toPayload(school);
  }

  async updateBranding(acl: RequestAcl, body: unknown): Promise<BrandingPayload> {
    this.policy.assertUpdateBranding(acl);
    const input = this.parseOrBadRequest(brandingUpdateSchema, body);

    const school = await this.prisma.withSchool(acl.schoolId, async (tx) => {
      const current = await tx.school.findUniqueOrThrow({ where: { id: acl.schoolId } });
      const currentTheme = current.theme as BrandingTheme;
      const currentTypography = current.typography as BrandingTypography;

      const nextTheme = input.theme
        ? { ...currentTheme, ...input.theme }
        : undefined;

      const nextTypography = input.typography
        ? resolveTypographyUpdate(currentTypography, input.typography)
        : undefined;

      const updated = await tx.school.update({
        where: { id: acl.schoolId },
        data: {
          name: input.schoolName,
          tagline: input.tagline,
          location: input.location,
          theme: nextTheme as object | undefined,
          typography: nextTypography as object | undefined,
        },
      });
      await this.audit(tx, acl, PERMISSIONS.SCHOOL_BRANDING_UPDATE, "school", acl.schoolId, {
        schoolName: input.schoolName,
        tagline: input.tagline,
        location: input.location,
        theme: input.theme,
        typography: input.typography,
      });
      return updated;
    });
    return this.toPayload(school);
  }

  async setLogoUrl(acl: RequestAcl, logoUrl: string) {
    this.policy.assertUpdateBranding(acl);
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const updated = await tx.school.update({
        where: { id: acl.schoolId },
        data: { logoUrl },
      });
      await this.audit(tx, acl, PERMISSIONS.SCHOOL_BRANDING_UPDATE, "school", acl.schoolId, {
        logoUrl,
      });
      return updated;
    });
  }

  toPayload(school: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    location: string;
    logoUrl: string | null;
    poweredBy: string;
    receiptPrefix: string;
    defaultLanguage: string;
    attendanceMode: string;
    theme: unknown;
    typography: unknown;
  }): BrandingPayload {
    return {
      tenantId: school.id,
      slug: school.slug,
      schoolName: school.name,
      tagline: school.tagline,
      location: school.location,
      logoUrl: school.logoUrl,
      poweredBy: school.poweredBy,
      theme: school.theme as BrandingPayload["theme"],
      typography: school.typography as BrandingPayload["typography"],
      receiptPrefix: school.receiptPrefix,
      defaultLanguage: school.defaultLanguage,
      attendanceMode: school.attendanceMode,
    };
  }
}
