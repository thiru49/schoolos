import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { PERMISSIONS, ROLE_CODES } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { RolesPolicy, type RoleWithPermissions } from "./roles.policy";

function createAcl(partial: Partial<RequestAcl> = {}): RequestAcl {
  return {
    userId: "admin-user",
    schoolId: "school-1",
    roles: [ROLE_CODES.SCHOOL_SUPER_ADMIN],
    permissions: [
      PERMISSIONS.ROLES_ASSIGN,
      PERMISSIONS.STUDENTS_READ,
      PERMISSIONS.STUDENTS_WRITE,
      PERMISSIONS.TEACHERS_READ,
      PERMISSIONS.TEACHERS_WRITE,
    ],
    scopes: [{ type: "school" }],
    ...partial,
  };
}

describe("RolesPolicy", () => {
  const policy = new RolesPolicy();

  describe("assertCanAssign", () => {
    it("allows assignment when user has roles.assign and school scope", () => {
      expect(() => policy.assertCanAssign(createAcl())).not.toThrow();
    });

    it("denies assignment when missing roles.assign permission", () => {
      const acl = createAcl({ permissions: [PERMISSIONS.STUDENTS_READ] });
      expect(() => policy.assertCanAssign(acl)).toThrow(ForbiddenException);
    });

    it("denies assignment when missing school scope", () => {
      const acl = createAcl({ scopes: [{ type: "section", sectionId: "sec-1" }] });
      expect(() => policy.assertCanAssign(acl)).toThrow(ForbiddenException);
    });
  });

  describe("assertCanGrantRole (privilege escalation protection)", () => {
    it("strictly blocks assignment of platform_owner role", () => {
      const role: RoleWithPermissions = {
        id: "r-platform",
        code: ROLE_CODES.PLATFORM_OWNER,
        name: "Platform Owner",
        isSystem: true,
        rolePermissions: [{ permission: { code: PERMISSIONS.ROLES_ASSIGN } }],
      };
      expect(() => policy.assertCanGrantRole(createAcl(), role)).toThrow(ForbiddenException);
    });

    it("allows granting a role whose permissions are a subset of caller permissions", () => {
      const role: RoleWithPermissions = {
        id: "r-teacher",
        code: ROLE_CODES.TEACHER,
        name: "Teacher",
        isSystem: true,
        rolePermissions: [
          { permission: { code: PERMISSIONS.TEACHERS_READ } },
          { permission: { code: PERMISSIONS.STUDENTS_READ } },
        ],
      };
      expect(() => policy.assertCanGrantRole(createAcl(), role)).not.toThrow();
    });

    it("blocks granting a role containing permissions the caller does not hold", () => {
      const callerAcl = createAcl({
        permissions: [PERMISSIONS.ROLES_ASSIGN, PERMISSIONS.STUDENTS_READ],
      });
      const role: RoleWithPermissions = {
        id: "r-accounts",
        code: ROLE_CODES.ACCOUNTS_ADMIN,
        name: "Accounts Admin",
        isSystem: true,
        rolePermissions: [
          { permission: { code: PERMISSIONS.STUDENTS_READ } },
          { permission: { code: PERMISSIONS.FEES_RECORD } }, // Caller lacks FEES_RECORD
        ],
      };
      expect(() => policy.assertCanGrantRole(callerAcl, role)).toThrow(ForbiddenException);
    });
  });

  describe("validateScopeShape (DB constraint enforcement)", () => {
    it("validates valid scope shapes correctly", () => {
      expect(() => policy.validateScopeShape({ scopeType: "school" })).not.toThrow();
      expect(() =>
        policy.validateScopeShape({ scopeType: "class", classId: "c1" }),
      ).not.toThrow();
      expect(() =>
        policy.validateScopeShape({ scopeType: "section", classId: "c1", sectionId: "s1" }),
      ).not.toThrow();
      expect(() =>
        policy.validateScopeShape({
          scopeType: "subject",
          classId: "c1",
          sectionId: "s1",
          subjectId: "sub1",
        }),
      ).not.toThrow();
      expect(() =>
        policy.validateScopeShape({ scopeType: "self", studentId: "stu1" }),
      ).not.toThrow();
      expect(() =>
        policy.validateScopeShape({ scopeType: "children", studentId: "stu1" }),
      ).not.toThrow();
    });

    it("rejects school scope with extra IDs", () => {
      expect(() =>
        policy.validateScopeShape({ scopeType: "school", classId: "c1" }),
      ).toThrow(BadRequestException);
    });

    it("rejects class scope without classId", () => {
      expect(() => policy.validateScopeShape({ scopeType: "class" })).toThrow(
        BadRequestException,
      );
    });

    it("rejects section scope missing classId or sectionId", () => {
      expect(() =>
        policy.validateScopeShape({ scopeType: "section", sectionId: "s1" }),
      ).toThrow(BadRequestException);
      expect(() =>
        policy.validateScopeShape({ scopeType: "section", classId: "c1" }),
      ).toThrow(BadRequestException);
    });

    it("rejects self / children scope without studentId", () => {
      expect(() => policy.validateScopeShape({ scopeType: "self" })).toThrow(
        BadRequestException,
      );
      expect(() => policy.validateScopeShape({ scopeType: "children" })).toThrow(
        BadRequestException,
      );
    });

    it("rejects self / children scope with classId or sectionId", () => {
      expect(() =>
        policy.validateScopeShape({ scopeType: "self", studentId: "stu1", classId: "c1" }),
      ).toThrow(BadRequestException);
    });
  });
});
