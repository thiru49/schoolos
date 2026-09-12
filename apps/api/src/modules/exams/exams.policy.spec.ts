import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { ExamsPolicy } from "./exams.policy";

function teacher(): RequestAcl {
  return {
    userId: "t1",
    schoolId: "s1",
    roles: ["teacher"],
    permissions: [PERMISSIONS.MARKS_DRAFT, PERMISSIONS.MARKS_SUBMIT, PERMISSIONS.EXAMS_READ],
    scopes: [{ type: "section", classId: "c8", sectionId: "sec-8a" }],
  };
}

describe("ExamsPolicy", () => {
  const policy = new ExamsPolicy();

  it("allows teacher draft on 8-A", () => {
    expect(() => policy.assertDraftSection(teacher(), "sec-8a", "c8")).not.toThrow();
  });

  it("denies teacher draft on 9-B", () => {
    expect(() => policy.assertDraftSection(teacher(), "sec-9b", "c9")).toThrow(ForbiddenException);
  });

  it("denies teacher publish", () => {
    expect(() => policy.assertPublish(teacher())).toThrow(ForbiddenException);
  });
});
