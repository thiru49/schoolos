import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { HomeworkPolicy } from "./homework.policy";

function acl(partial: Partial<RequestAcl>): RequestAcl {
  return {
    userId: "u1",
    schoolId: "s1",
    roles: ["teacher"],
    permissions: [PERMISSIONS.HOMEWORK_CREATE, PERMISSIONS.HOMEWORK_READ],
    scopes: [{ type: "section", classId: "c8", sectionId: "sec-8a" }],
    ...partial,
  };
}

describe("HomeworkPolicy", () => {
  const policy = new HomeworkPolicy();

  it("allows teacher to create for assigned 8-A", () => {
    expect(() => policy.assertCreateSection(acl({}), "sec-8a", "c8")).not.toThrow();
  });

  it("denies teacher creating for 9-B", () => {
    expect(() => policy.assertCreateSection(acl({}), "sec-9b", "c9")).toThrow(ForbiddenException);
  });

  it("allows a parent to read a linked child's section", () => {
    const parent = acl({
      roles: ["parent"],
      permissions: [PERMISSIONS.HOMEWORK_READ],
      scopes: [{ type: "children", studentId: "arun" }],
    });
    expect(() => policy.assertReadSection(parent, "sec-8a", "c8", { childInSection: true })).not.toThrow();
  });

  it("denies a parent reading an unlinked section", () => {
    const parent = acl({
      roles: ["parent"],
      permissions: [PERMISSIONS.HOMEWORK_READ],
      scopes: [{ type: "children", studentId: "arun" }],
    });
    expect(() => policy.assertReadSection(parent, "sec-9b", "c9")).toThrow(ForbiddenException);
  });

  it("allows a student to complete only self", () => {
    const student = acl({
      roles: ["student"],
      permissions: [PERMISSIONS.HOMEWORK_COMPLETE],
      scopes: [{ type: "self", studentId: "arun" }],
    });
    expect(() => policy.assertComplete(student, "arun")).not.toThrow();
    expect(() => policy.assertComplete(student, "maria")).toThrow(ForbiddenException);
  });
});
