import { ConflictException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSchoolUser, hashPassword } from "../../common/people/school-user";
import { seedRolesForSchool } from "@schoolos/tenant-bootstrap";
import { ProvisioningService } from "./provisioning.service";

vi.mock("../../common/people/school-user", () => ({
  createSchoolUser: vi.fn(),
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

vi.mock("@schoolos/tenant-bootstrap", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@schoolos/tenant-bootstrap")>();
  return {
    ...actual,
    seedRolesForSchool: vi.fn().mockResolvedValue(undefined),
  };
});

const baseInput = {
  slug: "new-school",
  name: "New School",
  admin: {
    identifier: "admin@school.test",
    displayName: "School Admin",
    password: "Password123!",
  },
};

function createService(overrides?: {
  getSchoolBySlug?: (slug: string) => Promise<unknown>;
  queryRaw?: (query: unknown) => Promise<unknown[]>;
  transactionImpl?: (fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
}) {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    school: {
      create: vi.fn().mockResolvedValue({
        id: "school-1",
        slug: "new-school",
        name: "New School",
        tagline: "Learning · Care · Excellence",
        location: "Tamil Nadu",
        poweredBy: "CREOVY Digital Solutions",
        receiptPrefix: "NEW/26-27",
        defaultLanguage: "en",
        attendanceMode: "daily",
        theme: {},
        typography: {},
        logoUrl: null,
      }),
    },
    academicYear: {
      create: vi.fn().mockResolvedValue({ id: "year-1", name: "2026-27", isActive: true }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  };

  const prisma = {
    $transaction: overrides?.transactionImpl ?? vi.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
    $queryRaw: overrides?.queryRaw ?? vi.fn().mockResolvedValue([]),
  };

  const tenancy = {
    getSchoolBySlug:
      overrides?.getSchoolBySlug ?? vi.fn().mockRejectedValue(new NotFoundException("School unavailable")),
  };

  return {
    service: new ProvisioningService(prisma as never, tenancy as never),
    tx,
    prisma,
  };
}

describe("ProvisioningService", () => {
  beforeEach(() => {
    vi.mocked(createSchoolUser).mockResolvedValue({
      id: "admin-1",
      identifier: "admin@school.test",
      displayName: "School Admin",
    } as never);
    vi.mocked(hashPassword).mockResolvedValue("hashed-password");
    vi.mocked(seedRolesForSchool).mockResolvedValue(undefined);
  });

  it("rejects duplicate slug before provisioning", async () => {
    const { service } = createService({
      getSchoolBySlug: vi.fn().mockResolvedValue({ id: "existing", slug: "new-school" }),
    });

    await expect(service.provisionSchool(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects duplicate admin identifier on the platform", async () => {
    const { service } = createService({
      queryRaw: vi.fn().mockResolvedValue([{ id: "existing-user" }]),
    });

    await expect(service.provisionSchool(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects duplicate admin identifier in the new tenant", async () => {
    const { service } = createService();
    vi.mocked(createSchoolUser).mockRejectedValue(
      new ConflictException("Identifier already exists in this school"),
    );

    await expect(service.provisionSchool(baseInput)).rejects.toBeInstanceOf(ConflictException);
  });

  it("returns provision payload with tenant metadata", async () => {
    const { service, tx } = createService();

    const result = await service.provisionSchool(baseInput);

    expect(result.slug).toBe("new-school");
    expect(result.admin.roleCode).toBe("school_super_admin");
    expect(result.academicYear?.name).toBe("2026-27");
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(seedRolesForSchool).toHaveBeenCalled();
    expect(createSchoolUser).toHaveBeenCalled();
  });
});
