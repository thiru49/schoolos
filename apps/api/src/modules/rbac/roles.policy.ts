import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PERMISSIONS, ROLE_CODES, type PermissionCode, type RoleCode } from "@schoolos/permissions";
import type { UserScopeItemInput } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { hasSchoolScope } from "../../common/people/school-user";

export interface RoleWithPermissions {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  rolePermissions: {
    permission: {
      code: string;
    };
  }[];
}

@Injectable()
export class RolesPolicy {
  assertCanAssign(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.ROLES_ASSIGN)) {
      throw new ForbiddenException("Missing permission roles.assign");
    }
    if (!hasSchoolScope(acl)) {
      throw new ForbiddenException("Role assignment requires school scope");
    }
  }

  assertCanGrantRole(acl: RequestAcl, role: RoleWithPermissions) {
    if (role.code === ROLE_CODES.PLATFORM_OWNER || role.code === "platform_owner") {
      throw new ForbiddenException("Cannot assign platform-level role platform_owner");
    }

    const callerPerms = new Set(acl.permissions);
    const unpossessed = role.rolePermissions
      .map((rp) => rp.permission.code)
      .filter((p) => !callerPerms.has(p as PermissionCode));

    if (unpossessed.length > 0) {
      throw new ForbiddenException(
        `Cannot grant role ${role.code}: contains permissions you do not possess (${unpossessed.join(", ")})`,
      );
    }
  }

  validateScopeShape(scope: UserScopeItemInput) {
    const { scopeType, classId, sectionId, subjectId, studentId } = scope;
    switch (scopeType) {
      case "school":
        if (classId || sectionId || subjectId || studentId) {
          throw new BadRequestException("School scope must not specify classId, sectionId, subjectId, or studentId");
        }
        break;

      case "class":
        if (!classId || sectionId || subjectId || studentId) {
          throw new BadRequestException("Class scope requires classId and must not specify sectionId, subjectId, or studentId");
        }
        break;

      case "section":
        if (!classId || !sectionId || subjectId || studentId) {
          throw new BadRequestException("Section scope requires both classId and sectionId, and must not specify subjectId or studentId");
        }
        break;

      case "subject":
        if (!classId || !sectionId || !subjectId || studentId) {
          throw new BadRequestException("Subject scope requires classId, sectionId, and subjectId, and must not specify studentId");
        }
        break;

      case "self":
        if (!studentId || classId || sectionId || subjectId) {
          throw new BadRequestException("Self scope requires studentId and must not specify classId, sectionId, or subjectId");
        }
        break;

      case "children":
        if (!studentId || classId || sectionId || subjectId) {
          throw new BadRequestException("Children scope requires studentId and must not specify classId, sectionId, or subjectId");
        }
        break;

      default:
        throw new BadRequestException(`Unsupported scope type: ${String(scopeType)}`);
    }
  }
}
