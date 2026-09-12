import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { StudentsPolicy } from "./students.policy";

function acl(partial: Partial<RequestAcl>): RequestAcl {
  return {
    userId: "u1",
    schoolId: "s1",
    roles: ["teacher"],
    permissions: [PERMISSIONS.STUDENTS_READ],
    scopes: [{ type: "section", sectionId: "sec-8a" }],
    ...partial,
  };
}

describe("StudentsPolicy", () => {
  const policy = new StudentsPolicy();

  it("allows teacher to read 8-A student", () => {
    expect(() => policy.assertSeeStudent(acl({}), { id: "st1", sectionId: "sec-8a" })).not.toThrow();
  });

  it("denies teacher reading 9-B student", () => {
    expect(() => policy.assertSeeStudent(acl({}), { id: "st2", sectionId: "sec-9b" })).toThrow(ForbiddenException);
  });

  it("denies teacher write", () => {
    expect(() => policy.assertWrite(acl({}))).toThrow(ForbiddenException);
  });
});
