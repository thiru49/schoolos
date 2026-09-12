import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { AclPayload, AclScope, PermissionCode, RoleCode } from "@schoolos/types";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async loadAcl(userId: string, schoolId: string): Promise<AclPayload> {
    return this.prisma.withSchool(schoolId, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, schoolId, isActive: true },
        include: {
          userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
          userScopes: true,
        },
      });
      if (!user) throw new UnauthorizedException("User not in this school");

      const roles = user.userRoles.map((ur) => ur.role.code as RoleCode);
      const permissions = [
        ...new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.code as PermissionCode),
          ),
        ),
      ];
      const scopes: AclScope[] = user.userScopes.map((s) => ({
        type: s.scopeType as AclScope["type"],
        classId: s.classId ?? undefined,
        sectionId: s.sectionId ?? undefined,
        subjectId: s.subjectId ?? undefined,
        studentId: s.studentId ?? undefined,
      }));

      return { userId, schoolId, roles, permissions, scopes };
    });
  }
}
