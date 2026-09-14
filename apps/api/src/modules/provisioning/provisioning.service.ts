import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ROLE_CODES } from "@schoolos/permissions";
import type { ProvisionSchoolResult } from "@schoolos/types";
import {
  DEFAULT_POWERED_BY,
  DEFAULT_SCHOOL_THEME,
  PROVISION_AUDIT_ACTION,
  defaultTypographyForPreset,
  seedRolesForSchool,
} from "@schoolos/tenant-bootstrap";
import { provisionSchoolSchema } from "@schoolos/validation";
import { randomUUID } from "crypto";
import { createSchoolUser, hashPassword } from "../../common/people/school-user";
import { PrismaService } from "../../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";

const INITIAL_ADMIN_ROLE = ROLE_CODES.SCHOOL_SUPER_ADMIN;

@Injectable()
export class ProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
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

  private async assertSlugAvailable(slug: string): Promise<void> {
    try {
      await this.tenancy.getSchoolBySlug(slug);
      throw new ConflictException(`School slug "${slug}" is already in use`);
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      if (err instanceof NotFoundException) return;
      throw err;
    }
  }

  private async assertAdminIdentifierAvailable(identifier: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE identifier = ${identifier} LIMIT 1
    `;
    if (rows.length > 0) {
      throw new ConflictException("Admin identifier is already in use on the platform");
    }
  }

  async provisionSchool(body: unknown): Promise<ProvisionSchoolResult> {
    const input = this.parseOrBadRequest(provisionSchoolSchema, body);
    await this.assertSlugAvailable(input.slug);
    await this.assertAdminIdentifierAvailable(input.admin.identifier);

    const schoolId = randomUUID();
    const passwordHash = await hashPassword(input.admin.password);
    const typography = defaultTypographyForPreset(input.typographyPreset);
    const tagline = input.tagline ?? "Learning · Care · Excellence";
    const location = input.location ?? "Tamil Nadu";
    const receiptPrefix = input.receiptPrefix ?? `${input.slug.toUpperCase().slice(0, 3)}/26-27`;
    const academicYearInput = input.academicYear ?? { name: "2026-27", isActive: true };

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.school_id', ${schoolId}, true)`;

        const school = await tx.school.create({
          data: {
            id: schoolId,
            slug: input.slug,
            name: input.name,
            tagline,
            location,
            poweredBy: DEFAULT_POWERED_BY,
            receiptPrefix,
            defaultLanguage: input.defaultLanguage,
            attendanceMode: input.attendanceMode,
            theme: DEFAULT_SCHOOL_THEME,
            typography,
          },
        });

        await seedRolesForSchool(tx, schoolId);

        const admin = await createSchoolUser(tx, {
          schoolId,
          identifier: input.admin.identifier,
          displayName: input.admin.displayName,
          passwordHash,
          roleCode: INITIAL_ADMIN_ROLE,
          scopes: [{ scopeType: "school" }],
        });

        const academicYear = await tx.academicYear.create({
          data: {
            schoolId,
            name: academicYearInput.name,
            isActive: academicYearInput.isActive,
          },
        });

        await tx.auditLog.create({
          data: {
            schoolId,
            actorUserId: admin.id,
            action: PROVISION_AUDIT_ACTION,
            resource: "school",
            resourceId: schoolId,
            metadata: {
              slug: input.slug,
              provisionedBy: "platform_owner",
              adminIdentifier: input.admin.identifier,
              adminRoleCode: INITIAL_ADMIN_ROLE,
            },
          },
        });

        const apiBase = process.env.API_PUBLIC_URL ?? process.env.API_URL ?? "http://localhost:4000";

        return {
          schoolId: school.id,
          slug: school.slug,
          name: school.name,
          tagline: school.tagline,
          location: school.location,
          receiptPrefix: school.receiptPrefix,
          defaultLanguage: school.defaultLanguage,
          attendanceMode: school.attendanceMode,
          branding: {
            theme: school.theme as ProvisionSchoolResult["branding"]["theme"],
            typography: school.typography as ProvisionSchoolResult["branding"]["typography"],
            logoUrl: school.logoUrl,
            poweredBy: school.poweredBy,
          },
          admin: {
            userId: admin.id,
            identifier: admin.identifier,
            displayName: admin.displayName,
            roleCode: INITIAL_ADMIN_ROLE,
          },
          academicYear: {
            id: academicYear.id,
            name: academicYear.name,
            isActive: academicYear.isActive,
          },
          publicBrandingUrl: `${apiBase}/public/tenants/${school.slug}/branding`,
        };
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(",") : "field";
        if (target.includes("slug")) {
          throw new ConflictException(`School slug "${input.slug}" is already in use`);
        }
        if (target.includes("identifier")) {
          throw new ConflictException("Admin identifier already exists in this school");
        }
        throw new ConflictException("Provisioning conflict");
      }
      throw err;
    }
  }
}
