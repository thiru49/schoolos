import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { FeesPolicy } from "./fees.policy";

describe("FeesPolicy", () => {
  const policy = new FeesPolicy();

  it("allows parent to read linked child", () => {
    const acl: RequestAcl = {
      userId: "p1",
      schoolId: "s1",
      roles: ["parent"],
      permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
      scopes: [{ type: "children", studentId: "st1" }],
    };
    expect(() => policy.assertCanSeeStudent(acl, "st1", ["st1"])).not.toThrow();
  });

  it("denies parent reading another child", () => {
    const acl: RequestAcl = {
      userId: "p1",
      schoolId: "s1",
      roles: ["parent"],
      permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
      scopes: [{ type: "children", studentId: "st1" }],
    };
    expect(() => policy.assertCanSeeStudent(acl, "st2", ["st1"])).toThrow(ForbiddenException);
  });

  it("denies teacher recording fees", () => {
    const acl: RequestAcl = {
      userId: "t1",
      schoolId: "s1",
      roles: ["teacher"],
      permissions: [],
      scopes: [{ type: "section", sectionId: "sec-8a" }],
    };
    expect(() => policy.assertRecord(acl)).toThrow(ForbiddenException);
  });
});
