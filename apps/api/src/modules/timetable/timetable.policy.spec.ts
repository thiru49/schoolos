import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { TimetablePolicy } from "./timetable.policy";

function acl(partial: Partial<RequestAcl>): RequestAcl {
  return {
    userId: "u1",
    schoolId: "s1",
    roles: ["teacher"],
    permissions: [PERMISSIONS.TIMETABLE_READ],
    scopes: [{ type: "section", classId: "c8", sectionId: "sec-8a" }],
    ...partial,
  };
}

describe("TimetablePolicy", () => {
  const policy = new TimetablePolicy();

  it("allows teacher to read assigned section", () => {
    expect(() => policy.assertReadSection(acl({}), "sec-8a", "c8")).not.toThrow();
  });

  it("denies teacher reading 9-B", () => {
    expect(() => policy.assertReadSection(acl({}), "sec-9b", "c9")).toThrow(ForbiddenException);
  });

  it("denies teacher write", () => {
    expect(() => policy.assertWrite(acl({}))).toThrow(ForbiddenException);
  });
});
