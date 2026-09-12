import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { TeachersPolicy } from "./teachers.policy";

function acl(partial: Partial<RequestAcl>): RequestAcl {
  return {
    userId: "teacher-user",
    schoolId: "s1",
    roles: ["teacher"],
    permissions: [PERMISSIONS.TEACHERS_READ],
    scopes: [{ type: "section", sectionId: "sec-8a" }],
    ...partial,
  };
}

describe("TeachersPolicy", () => {
  const policy = new TeachersPolicy();

  it("allows a teacher to read self", () => {
    expect(() => policy.assertSee(acl({}), { userId: "teacher-user" })).not.toThrow();
  });

  it("denies a teacher reading another teacher", () => {
    expect(() => policy.assertSee(acl({}), { userId: "other" })).toThrow(ForbiddenException);
  });

  it("denies teacher write", () => {
    expect(() => policy.assertWrite(acl({}))).toThrow(ForbiddenException);
  });
});
