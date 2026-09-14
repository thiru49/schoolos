import { Injectable, UnauthorizedException } from "@nestjs/common";
import { loginSchema, refreshSchema } from "@schoolos/validation";
import bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import { TenancyService } from "../tenancy/tenancy.service";
import { AuthTokenService } from "./auth-token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly tokens: AuthTokenService,
  ) {}

  async login(body: unknown) {
    const input = loginSchema.parse(body);
    const school = await this.tenancy.getSchoolBySlug(input.slug);

    return this.prisma.withSchool(school.id, async (tx) => {
      const user = await tx.user.findFirst({
        where: { schoolId: school.id, identifier: input.identifier, isActive: true },
        include: { userRoles: { include: { role: true } } },
      });
      if (!user) throw new UnauthorizedException("Invalid credentials");
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw new UnauthorizedException("Invalid credentials");

      if (input.roleHint) {
        const has = user.userRoles.some((ur) => ur.role.code === input.roleHint);
        if (!has) throw new UnauthorizedException("Wrong tenant membership");
      }

      const accessToken = this.tokens.signAccess({ sub: user.id, schoolId: school.id });
      const refresh = this.tokens.newRefreshToken();
      await tx.refreshToken.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          tokenHash: refresh.hash,
          expiresAt: refresh.expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: refresh.raw,
        user: {
          id: user.id,
          displayName: user.displayName,
          identifier: user.identifier,
          schoolId: school.id,
        },
      };
    });
  }

  async refresh(body: unknown) {
    const input = refreshSchema.parse(body);
    const school = await this.tenancy.getSchoolBySlug(input.slug);
    const hash = this.tokens.hashRefresh(input.refreshToken);

    return this.prisma.withSchool(school.id, async (tx) => {
      const stored = await tx.refreshToken.findFirst({
        where: {
          schoolId: school.id,
          tokenHash: hash,
          expiresAt: { gt: new Date() },
        },
      });
      if (!stored) throw new UnauthorizedException("Invalid refresh token");

      const user = await tx.user.findFirst({
        where: { id: stored.userId, schoolId: school.id, isActive: true },
      });
      if (!user) throw new UnauthorizedException("Invalid refresh token");

      await tx.refreshToken.delete({ where: { id: stored.id } });
      const accessToken = this.tokens.signAccess({ sub: user.id, schoolId: school.id });
      const refresh = this.tokens.newRefreshToken();
      await tx.refreshToken.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          tokenHash: refresh.hash,
          expiresAt: refresh.expiresAt,
        },
      });
      return { accessToken, refreshToken: refresh.raw };
    });
  }

  async logout(userId: string, schoolId: string) {
    await this.prisma.withSchool(schoolId, async (tx) => {
      await tx.refreshToken.deleteMany({ where: { userId, schoolId } });
    });
  }
}
