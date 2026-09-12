import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { AttendancePolicy } from "./attendance.policy";

function acl(partial: Partial<RequestAcl>): RequestAcl {
  return {
    userId: "u1",
    schoolId: "s1",
    roles: ["teacher"],
    permissions: [PERMISSIONS.ATTENDANCE_MARK, PERMISSIONS.ATTENDANCE_READ],
    scopes: [{ type: "section", classId: "c8", sectionId: "sec-8a" }],
    ...partial,
  };
}

describe("AttendancePolicy", () => {
  const policy = new AttendancePolicy();

  it("allows teacher to mark assigned section 8-A", () => {
    expect(() => policy.assertCanMarkSection(acl({}), "sec-8a", "c8")).not.toThrow();
  });

  it("denies teacher marking 9-B", () => {
    expect(() => policy.assertCanMarkSection(acl({}), "sec-9b", "c9")).toThrow(ForbiddenException);
  });

  it("allows school-wide scope", () => {
    const admin = acl({
      roles: ["school_super_admin"],
      scopes: [{ type: "school" }],
    });
    expect(() => policy.assertCanMarkSection(admin, "sec-9b", "c9")).not.toThrow();
  });

  it("allows a parent to read a linked child", () => {
    const parent = acl({
      roles: ["parent"],
      permissions: [PERMISSIONS.ATTENDANCE_READ],
      scopes: [{ type: "children" }],
    });
    expect(() =>
      policy.assertCanReadStudent(
        parent,
        { id: "arun", sectionId: "sec-8a", classId: "c8" },
        ["arun"],
      ),
    ).not.toThrow();
  });

  it("denies a parent reading an unlinked student", () => {
    const parent = acl({
      roles: ["parent"],
      permissions: [PERMISSIONS.ATTENDANCE_READ],
      scopes: [{ type: "children" }],
    });
    expect(() =>
      policy.assertCanReadStudent(
        parent,
        { id: "maria", sectionId: "sec-9b", classId: "c9" },
        ["arun"],
      ),
    ).toThrow(ForbiddenException);
  });

  it("denies export-style section read outside teacher scope", () => {
    expect(() => policy.assertCanReadSection(acl({}), "sec-9b", "c9")).toThrow(ForbiddenException);
  });
});
