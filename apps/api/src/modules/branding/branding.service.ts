import { Injectable } from "@nestjs/common";
import type { BrandingPayload } from "@schoolos/types";
import { brandingUpdateSchema } from "@schoolos/validation";
import { PrismaService } from "../../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";

@Injectable()
export class BrandingService {
  constructor(
    private readonly tenancy: TenancyService,
    private readonly prisma: PrismaService,
  ) {}

  async publicBySlug(slug: string): Promise<BrandingPayload> {
    const school = await this.tenancy.getSchoolBySlug(slug);
    return this.toPayload(school);
  }

  async update(schoolId: string, body: unknown): Promise<BrandingPayload> {
    const input = brandingUpdateSchema.parse(body);
    const school = await this.prisma.withSchool(schoolId, async (tx) => {
      return tx.school.update({
        where: { id: schoolId },
        data: {
          name: input.schoolName,
          tagline: input.tagline,
          location: input.location,
          receiptPrefix: input.receiptPrefix,
          defaultLanguage: input.defaultLanguage,
          attendanceMode: input.attendanceMode,
          theme: input.theme as object | undefined,
          typography: input.typography as object | undefined,
        },
      });
    });
    return this.toPayload(school);
  }

  async setLogoUrl(schoolId: string, logoUrl: string) {
    return this.prisma.withSchool(schoolId, async (tx) => {
      return tx.school.update({ where: { id: schoolId }, data: { logoUrl } });
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
