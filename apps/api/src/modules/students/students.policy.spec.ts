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
    expect(() =>
      policy.assertSeeStudent(acl({}), { id: "st1", sectionId: "sec-8a", classId: "c8" }),
    ).not.toThrow();
  });

  it("denies teacher reading 9-B student", () => {
    expect(() =>
      policy.assertSeeStudent(acl({}), { id: "st2", sectionId: "sec-9b", classId: "c9" }),
    ).toThrow(ForbiddenException);
  });

  it("allows a parent to read a linked child", () => {
    const parent = acl({
      roles: ["parent"],
      scopes: [{ type: "children", studentId: "arun" }],
    });
    expect(() =>
      policy.assertSeeStudent(parent, { id: "arun", sectionId: "sec-8a", classId: "c8" }),
    ).not.toThrow();
  });

  it("denies a parent reading an unlinked student", () => {
    const parent = acl({
      roles: ["parent"],
      scopes: [{ type: "children", studentId: "arun" }],
    });
    expect(() =>
      policy.assertSeeStudent(parent, { id: "maria", sectionId: "sec-9b", classId: "c9" }),
    ).toThrow(ForbiddenException);
  });

  it("denies teacher write", () => {
    expect(() => policy.assertWrite(acl({}))).toThrow(ForbiddenException);
  });
});
