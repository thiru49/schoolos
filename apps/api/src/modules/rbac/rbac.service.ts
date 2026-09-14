import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PERMISSIONS, ROLE_CODES, type PermissionCode, type RoleCode, type ScopeType } from "@schoolos/permissions";
import type { AclPayload, AclScope } from "@schoolos/types";
import type { AssignRolesInput, UpdateScopesInput, UserListQueryInput } from "@schoolos/validation";
import type { Prisma } from "@prisma/client";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { RolesPolicy } from "./roles.policy";

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: RolesPolicy,
  ) {}

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

  async listRoles(schoolId: string) {
    return this.prisma.withSchool(schoolId, async (tx) => {
      const roles = await tx.role.findMany({
        where: { schoolId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      return roles.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        isSystem: r.isSystem,
        permissions: r.rolePermissions.map((rp) => rp.permission.code as PermissionCode),
      }));
    });
  }

  async listSubjects(schoolId: string) {
    return this.prisma.withSchool(schoolId, async (tx) => {
      const subjects = await tx.subject.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
      });

      return subjects.map((s) => ({
        id: s.id,
        name: s.name,
      }));
    });
  }

  async listSchoolUsers(schoolId: string, query?: UserListQueryInput) {
    return this.prisma.withSchool(schoolId, async (tx) => {
      const where: Prisma.UserWhereInput = { schoolId };
      if (query?.search) {
        where.OR = [
          { displayName: { contains: query.search, mode: "insensitive" } },
          { identifier: { contains: query.search, mode: "insensitive" } },
        ];
      }
      if (query?.role) {
        where.userRoles = {
          some: {
            role: {
              code: query.role,
            },
          },
        };
      }

      const users = await tx.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          userScopes: true,
        },
        orderBy: { displayName: "asc" },
      });

      return users.map((u) => ({
        id: u.id,
        identifier: u.identifier,
        displayName: u.displayName,
        isActive: u.isActive,
        schoolId: u.schoolId,
        roles: u.userRoles.map((ur) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
          isSystem: ur.role.isSystem,
          permissions: ur.role.rolePermissions.map((rp) => rp.permission.code as PermissionCode),
        })),
        scopes: u.userScopes.map((s) => ({
          type: s.scopeType as ScopeType,
          classId: s.classId ?? undefined,
          sectionId: s.sectionId ?? undefined,
          subjectId: s.subjectId ?? undefined,
          studentId: s.studentId ?? undefined,
        })),
      }));
    });
  }

  async getUserRolesAndScopes(schoolId: string, userId: string) {
    return this.prisma.withSchool(schoolId, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, schoolId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          userScopes: true,
        },
      });
      if (!user) throw new NotFoundException("Target user not found in this school");

      return {
        id: user.id,
        identifier: user.identifier,
        displayName: user.displayName,
        isActive: user.isActive,
        schoolId: user.schoolId,
        roles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
          isSystem: ur.role.isSystem,
          permissions: ur.role.rolePermissions.map((rp) => rp.permission.code as PermissionCode),
        })),
        scopes: user.userScopes.map((s) => ({
          type: s.scopeType as ScopeType,
          classId: s.classId ?? undefined,
          sectionId: s.sectionId ?? undefined,
          subjectId: s.subjectId ?? undefined,
          studentId: s.studentId ?? undefined,
        })),
      };
    });
  }

  async assignRoles(acl: RequestAcl, targetUserId: string, input: AssignRolesInput) {
    this.policy.assertCanAssign(acl);

    const roleCodes = [...new Set(input.roleCodes)];
    if (roleCodes.some((code) => code === ROLE_CODES.PLATFORM_OWNER || code === "platform_owner")) {
      throw new ForbiddenException("Cannot assign platform-level role platform_owner");
    }

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, schoolId: acl.schoolId },
      });
      if (!targetUser) {
        throw new NotFoundException("Target user not found in this school");
      }

      const roles = await tx.role.findMany({
        where: {
          schoolId: acl.schoolId,
          code: { in: roleCodes },
        },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (roles.length !== roleCodes.length) {
        const foundCodes = new Set(roles.map((r) => r.code));
        const missing = roleCodes.filter((c) => !foundCodes.has(c));
        throw new BadRequestException(`Unknown or invalid roles for this school: ${missing.join(", ")}`);
      }

      for (const role of roles) {
        this.policy.assertCanGrantRole(acl, role);
      }

      await tx.userRole.deleteMany({
        where: { userId: targetUser.id, schoolId: acl.schoolId },
      });

      await tx.userRole.createMany({
        data: roles.map((r) => ({
          userId: targetUser.id,
          roleId: r.id,
          schoolId: acl.schoolId,
        })),
      });

      await tx.auditLog.create({
        data: {
          schoolId: acl.schoolId,
          actorUserId: acl.userId,
          action: PERMISSIONS.ROLES_ASSIGN,
          resource: "user_roles",
          resourceId: targetUser.id,
          metadata: {
            targetUserId: targetUser.id,
            assignedRoleCodes: roleCodes,
          },
        },
      });

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: targetUser.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          userScopes: true,
        },
      });

      return {
        id: updatedUser.id,
        identifier: updatedUser.identifier,
        displayName: updatedUser.displayName,
        isActive: updatedUser.isActive,
        schoolId: updatedUser.schoolId,
        roles: updatedUser.userRoles.map((ur) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
          isSystem: ur.role.isSystem,
          permissions: ur.role.rolePermissions.map((rp) => rp.permission.code as PermissionCode),
        })),
        scopes: updatedUser.userScopes.map((s) => ({
          type: s.scopeType as ScopeType,
          classId: s.classId ?? undefined,
          sectionId: s.sectionId ?? undefined,
          subjectId: s.subjectId ?? undefined,
          studentId: s.studentId ?? undefined,
        })),
      };
    });
  }

  async updateScopes(acl: RequestAcl, targetUserId: string, input: UpdateScopesInput) {
    this.policy.assertCanAssign(acl);

    for (const scope of input.scopes) {
      this.policy.validateScopeShape(scope);
    }

    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const targetUser = await tx.user.findFirst({
        where: { id: targetUserId, schoolId: acl.schoolId },
      });
      if (!targetUser) {
        throw new NotFoundException("Target user not found in this school");
      }

      for (const scope of input.scopes) {
        if (scope.classId) {
          const cls = await tx.class.findFirst({
            where: { id: scope.classId, schoolId: acl.schoolId },
          });
          if (!cls) throw new BadRequestException(`Class ${scope.classId} does not belong to this school`);
        }

        if (scope.sectionId) {
          const sec = await tx.section.findFirst({
            where: {
              id: scope.sectionId,
              schoolId: acl.schoolId,
              ...(scope.classId ? { classId: scope.classId } : {}),
            },
          });
          if (!sec) throw new BadRequestException(`Section ${scope.sectionId} does not belong to this school or class`);
        }

        if (scope.subjectId) {
          const sub = await tx.subject.findFirst({
            where: { id: scope.subjectId, schoolId: acl.schoolId },
          });
          if (!sub) throw new BadRequestException(`Subject ${scope.subjectId} does not belong to this school`);
        }

        if (scope.studentId) {
          const stu = await tx.student.findFirst({
            where: { id: scope.studentId, schoolId: acl.schoolId },
          });
          if (!stu) throw new BadRequestException(`Student ${scope.studentId} does not belong to this school`);
        }
      }

      await tx.userScope.deleteMany({
        where: { userId: targetUser.id, schoolId: acl.schoolId },
      });

      if (input.scopes.length > 0) {
        await tx.userScope.createMany({
          data: input.scopes.map((s) => ({
            schoolId: acl.schoolId,
            userId: targetUser.id,
            scopeType: s.scopeType,
            classId: s.classId ?? null,
            sectionId: s.sectionId ?? null,
            subjectId: s.subjectId ?? null,
            studentId: s.studentId ?? null,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: acl.schoolId,
          actorUserId: acl.userId,
          action: PERMISSIONS.ROLES_ASSIGN,
          resource: "user_scopes",
          resourceId: targetUser.id,
          metadata: {
            targetUserId: targetUser.id,
            scopes: input.scopes,
          },
        },
      });

      const updatedUser = await tx.user.findUniqueOrThrow({
        where: { id: targetUser.id },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          userScopes: true,
        },
      });

      return {
        id: updatedUser.id,
        identifier: updatedUser.identifier,
        displayName: updatedUser.displayName,
        isActive: updatedUser.isActive,
        schoolId: updatedUser.schoolId,
        roles: updatedUser.userRoles.map((ur) => ({
          id: ur.role.id,
          code: ur.role.code,
          name: ur.role.name,
          isSystem: ur.role.isSystem,
          permissions: ur.role.rolePermissions.map((rp) => rp.permission.code as PermissionCode),
        })),
        scopes: updatedUser.userScopes.map((s) => ({
          type: s.scopeType as ScopeType,
          classId: s.classId ?? undefined,
          sectionId: s.sectionId ?? undefined,
          subjectId: s.subjectId ?? undefined,
          studentId: s.studentId ?? undefined,
        })),
      };
    });
  }
}
