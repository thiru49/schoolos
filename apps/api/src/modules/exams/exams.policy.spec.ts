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

  it("allows teacher submit on 8-A and denies 9-B", () => {
    expect(() => policy.assertSubmitSection(teacher(), "sec-8a", "c8")).not.toThrow();
    expect(() => policy.assertSubmitSection(teacher(), "sec-9b", "c9")).toThrow(ForbiddenException);
  });

  it("allows teacher report card on 8-A and denies 9-B", () => {
    const t = {
      ...teacher(),
      permissions: [...teacher().permissions, PERMISSIONS.REPORTS_PROGRESS],
    };
    expect(() =>
      policy.assertViewReportCard(t, { id: "arun", sectionId: "sec-8a", classId: "c8" }),
    ).not.toThrow();
    expect(() =>
      policy.assertViewReportCard(t, { id: "maria", sectionId: "sec-9b", classId: "c9" }),
    ).toThrow(ForbiddenException);
  });

  it("allows parent report card for linked child only", () => {
    const parent: RequestAcl = {
      userId: "p1",
      schoolId: "s1",
      roles: ["parent"],
      permissions: [PERMISSIONS.MARKS_READ],
      scopes: [{ type: "children", studentId: "arun" }],
    };
    expect(() =>
      policy.assertViewReportCard(parent, { id: "arun", sectionId: "sec-8a", classId: "c8" }),
    ).not.toThrow();
    expect(() =>
      policy.assertViewReportCard(parent, { id: "maria", sectionId: "sec-9b", classId: "c9" }),
    ).toThrow(ForbiddenException);
  });

  it("denies a student drafting marks", () => {
    const student: RequestAcl = {
      userId: "st1",
      schoolId: "s1",
      roles: ["student"],
      permissions: [PERMISSIONS.EXAMS_READ, PERMISSIONS.MARKS_READ],
      scopes: [{ type: "self", studentId: "arun" }],
    };
    expect(() => policy.assertDraftSection(student, "sec-8a", "c8")).toThrow(ForbiddenException);
  });

  it("allows a parent to read a linked child's section", () => {
    const parent: RequestAcl = {
      userId: "p1",
      schoolId: "s1",
      roles: ["parent"],
      permissions: [PERMISSIONS.EXAMS_READ],
      scopes: [{ type: "children", studentId: "arun" }],
    };
    expect(() => policy.assertReadSection(parent, "sec-8a", "c8", { childInSection: true })).not.toThrow();
  });

  it("denies a parent reading an unlinked section", () => {
    const parent: RequestAcl = {
      userId: "p1",
      schoolId: "s1",
      roles: ["parent"],
      permissions: [PERMISSIONS.EXAMS_READ],
      scopes: [{ type: "children", studentId: "arun" }],
    };
    expect(() => policy.assertReadSection(parent, "sec-9b", "c9")).toThrow(ForbiddenException);
  });
});
