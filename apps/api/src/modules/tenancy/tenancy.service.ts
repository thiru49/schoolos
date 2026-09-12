import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async getSchoolBySlug(slug: string) {
    const rows = await this.prisma.$queryRaw<
      {
        id: string;
        slug: string;
        name: string;
        tagline: string;
        location: string;
        logo_url: string | null;
        powered_by: string;
        receipt_prefix: string;
        default_language: string;
        attendance_mode: string;
        theme: unknown;
        typography: unknown;
      }[]
    >`SELECT * FROM get_public_branding(${slug})`;
    const row = rows[0];
    if (!row) throw new NotFoundException("School unavailable");
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline,
      location: row.location,
      logoUrl: row.logo_url,
      poweredBy: row.powered_by,
      receiptPrefix: row.receipt_prefix,
      defaultLanguage: row.default_language,
      attendanceMode: row.attendance_mode,
      theme: row.theme,
      typography: row.typography,
    };
  }
}
