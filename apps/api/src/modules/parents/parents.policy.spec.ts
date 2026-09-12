import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { ParentsPolicy } from "./parents.policy";

function acl(partial: Partial<RequestAcl>): RequestAcl {
  return {
    userId: "parent-user",
    schoolId: "s1",
    roles: ["parent"],
    permissions: [PERMISSIONS.PARENTS_READ],
    scopes: [{ type: "children", studentId: "arun" }],
    ...partial,
  };
}

describe("ParentsPolicy", () => {
  const policy = new ParentsPolicy();

  it("allows a parent to read self", () => {
    expect(() => policy.assertSee(acl({}), { userId: "parent-user" })).not.toThrow();
  });

  it("denies a parent reading another parent", () => {
    expect(() => policy.assertSee(acl({}), { userId: "other" })).toThrow(ForbiddenException);
  });

  it("denies parent write", () => {
    expect(() => policy.assertWrite(acl({}))).toThrow(ForbiddenException);
  });
});
