import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AuthService } from "./auth.service";
import { AuthTokenService } from "./auth-token.service";

const schoolA = {
  id: "school-a-id",
  slug: "arulneri",
  name: "Arul Neri Academy",
};

const schoolB = {
  id: "school-b-id",
  slug: "school-b",
  name: "School B",
};

function createAuthService(overrides?: {
  withSchoolImpl?: (schoolId: string, fn: (tx: unknown) => Promise<unknown>) => Promise<unknown>;
  getSchoolBySlug?: (slug: string) => Promise<{ id: string; slug: string }>;
  hashRefresh?: (raw: string) => string;
  signAccess?: (payload: { sub: string; schoolId: string }) => string;
  newRefreshToken?: () => { raw: string; hash: string; expiresAt: Date };
}) {
  const refreshRow = {
    id: "rt-1",
    schoolId: schoolA.id,
    userId: "user-1",
    tokenHash: "hash-a",
    expiresAt: new Date(Date.now() + 60_000),
  };

  const tx = {
    refreshToken: {
      findFirst: vi.fn().mockResolvedValue(refreshRow),
      delete: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue({ id: "user-1", schoolId: schoolA.id, isActive: true }),
    },
  };

  const withSchool =
    overrides?.withSchoolImpl ??
    vi.fn(async (_schoolId: string, fn: (inner: typeof tx) => Promise<unknown>) => fn(tx));

  const tokens = {
    hashRefresh: overrides?.hashRefresh ?? vi.fn().mockReturnValue("hash-a"),
    signAccess: overrides?.signAccess ?? vi.fn().mockReturnValue("access-new"),
    newRefreshToken:
      overrides?.newRefreshToken ??
      vi.fn().mockReturnValue({
        raw: "refresh-new",
        hash: "hash-new",
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
  } as unknown as AuthTokenService;

  const tenancy = {
    getSchoolBySlug:
      overrides?.getSchoolBySlug ?? vi.fn().mockImplementation(async (slug: string) => {
        if (slug === schoolA.slug) return schoolA;
        if (slug === schoolB.slug) return schoolB;
        throw new UnauthorizedException("School unavailable");
      }),
  };

  const prisma = { withSchool };

  const service = new AuthService(prisma as never, tenancy as never, tokens);
  return { service, tx, tokens, withSchool, tenancy };
}

describe("AuthService.refresh", () => {
  it("rotates refresh token inside tenant context", async () => {
    const { service, tx, tokens } = createAuthService();
    const result = await service.refresh({ slug: schoolA.slug, refreshToken: "raw-a" });
    expect(result.accessToken).toBe("access-new");
    expect(result.refreshToken).toBe("refresh-new");
    expect(tx.refreshToken.delete).toHaveBeenCalledWith({ where: { id: "rt-1" } });
    expect(tx.refreshToken.create).toHaveBeenCalled();
    expect(tokens.signAccess).toHaveBeenCalledWith({ sub: "user-1", schoolId: schoolA.id });
  });

  it("rejects cross-tenant refresh slug", async () => {
    const { service, tx } = createAuthService();
    tx.refreshToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.refresh({ slug: schoolB.slug, refreshToken: "raw-a" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects expired or missing refresh token", async () => {
    const { service, tx } = createAuthService();
    tx.refreshToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.refresh({ slug: schoolA.slug, refreshToken: "stale" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rejects reuse after rotation", async () => {
    const { service, tx } = createAuthService();
    await service.refresh({ slug: schoolA.slug, refreshToken: "raw-a" });
    tx.refreshToken.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.refresh({ slug: schoolA.slug, refreshToken: "raw-a" }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
