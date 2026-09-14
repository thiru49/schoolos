import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { RequestAcl } from "../../common/types/request-acl";
import { BrandingPolicy } from "./branding.policy";
import { BrandingService } from "./branding.service";

const schoolRow = {
  id: "school-a",
  slug: "arulneri",
  name: "Arul Neri Academy",
  tagline: "Learning · Care · Excellence",
  location: "Tirunelveli",
  logoUrl: null,
  poweredBy: "CREOVY",
  receiptPrefix: "ANA/26-27",
  defaultLanguage: "en",
  attendanceMode: "daily",
  theme: {
    primary: "#0B3A6E",
    primaryDark: "#082A50",
    accent: "#E8A317",
    background: "#F4F7FB",
    success: "#16A34A",
    warning: "#F59E0B",
    danger: "#DC2626",
  },
  typography: {
    preset: "arulneri",
    source: "google",
    families: { display: "Plus Jakarta Sans", body: "Plus Jakarta Sans", tamil: "Noto Sans Tamil" },
    googleFamilies: [],
    files: {
      displayRegular: null,
      displayBold: null,
      bodyRegular: null,
      bodyBold: null,
      tamilRegular: null,
    },
    scale: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, display: 28 },
    lineHeight: { tight: 1.2, normal: 1.45, relaxed: 1.65 },
    weights: { regular: "400", medium: "500", semibold: "600", bold: "700" },
    letterSpacing: { display: 0, body: 0 },
  },
};

const acl: RequestAcl = {
  userId: "user-1",
  schoolId: "school-a",
  roles: ["school_super_admin"],
  permissions: ["school.settings.read"],
  scopes: [{ type: "school" }],
};

function createService(overrides?: {
  withSchool?: ReturnType<typeof vi.fn>;
  findUnique?: ReturnType<typeof vi.fn>;
}) {
  const findUnique = overrides?.findUnique ?? vi.fn().mockResolvedValue(schoolRow);
  const tx = { school: { findUnique } };
  const withSchool =
    overrides?.withSchool ??
    vi.fn(async (schoolId: string, fn: (client: typeof tx) => Promise<unknown>) => {
      expect(schoolId).toBe(acl.schoolId);
      return fn(tx);
    });

  const prisma = {
    withSchool,
    school: { findUnique: vi.fn() },
  };
  const tenancy = { getSchoolBySlug: vi.fn() };
  const policy = new BrandingPolicy();

  const service = new BrandingService(
    tenancy as never,
    prisma as never,
    policy,
  );

  return { service, prisma, withSchool, findUnique };
}

describe("BrandingService.getSettings", () => {
  it("reads the school through prisma.withSchool for tenant scoping", async () => {
    const { service, withSchool, findUnique, prisma } = createService();

    const payload = await service.getSettings(acl);

    expect(withSchool).toHaveBeenCalledOnce();
    expect(withSchool).toHaveBeenCalledWith(acl.schoolId, expect.any(Function));
    expect(findUnique).toHaveBeenCalledWith({ where: { id: acl.schoolId } });
    expect(prisma.school.findUnique).not.toHaveBeenCalled();
    expect(payload.tenantId).toBe(acl.schoolId);
    expect(payload.schoolName).toBe(schoolRow.name);
    expect(payload.slug).toBe(schoolRow.slug);
  });

  it("throws NotFoundException when the tenant school is missing", async () => {
    const { service } = createService({
      findUnique: vi.fn().mockResolvedValue(null),
    });

    await expect(service.getSettings(acl)).rejects.toBeInstanceOf(NotFoundException);
  });
});
