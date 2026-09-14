import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { AcademicsPolicy } from "./academics.policy";

const schoolAcl = (overrides: Partial<RequestAcl> = {}): RequestAcl => ({
  userId: "u1",
  schoolId: "s1",
  roles: ["school_super_admin"],
  permissions: [
    PERMISSIONS.ACADEMIC_YEAR_MANAGE,
    PERMISSIONS.CLASSES_MANAGE,
    PERMISSIONS.SUBJECTS_MANAGE,
  ],
  scopes: [{ type: "school" }],
  ...overrides,
});

describe("AcademicsPolicy", () => {
  const policy = new AcademicsPolicy();

  describe("assertReadAcademicYears", () => {
    it("allows classes.manage with school scope", () => {
      expect(() =>
        policy.assertReadAcademicYears(
          schoolAcl({ permissions: [PERMISSIONS.CLASSES_MANAGE] }),
        ),
      ).not.toThrow();
    });

    it("denies teacher without manage permissions", () => {
      expect(() =>
        policy.assertReadAcademicYears(
          schoolAcl({
            roles: ["teacher"],
            permissions: [],
            scopes: [{ type: "section", sectionId: "sec-1" }],
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe("assertManageAcademicYear", () => {
    it("allows academic_year.manage with school scope", () => {
      expect(() =>
        policy.assertManageAcademicYear(
          schoolAcl({ permissions: [PERMISSIONS.ACADEMIC_YEAR_MANAGE] }),
        ),
      ).not.toThrow();
    });

    it("denies missing permission", () => {
      expect(() =>
        policy.assertManageAcademicYear(schoolAcl({ permissions: [] })),
      ).toThrow(ForbiddenException);
    });

    it("denies without school scope", () => {
      expect(() =>
        policy.assertManageAcademicYear(
          schoolAcl({
            permissions: [PERMISSIONS.ACADEMIC_YEAR_MANAGE],
            scopes: [{ type: "section", sectionId: "sec-1" }],
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe("assertManageClasses", () => {
    it("allows classes.manage with school scope", () => {
      expect(() =>
        policy.assertManageClasses(schoolAcl({ permissions: [PERMISSIONS.CLASSES_MANAGE] })),
      ).not.toThrow();
    });

    it("denies teacher with section scope only", () => {
      expect(() =>
        policy.assertManageClasses(
          schoolAcl({
            roles: ["teacher"],
            permissions: [PERMISSIONS.CLASSES_MANAGE],
            scopes: [{ type: "section", sectionId: "sec-8a" }],
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe("assertManageSubjects", () => {
    it("allows subjects.manage with school scope", () => {
      expect(() =>
        policy.assertManageSubjects(schoolAcl({ permissions: [PERMISSIONS.SUBJECTS_MANAGE] })),
      ).not.toThrow();
    });

    it("denies missing permission", () => {
      expect(() =>
        policy.assertManageSubjects(schoolAcl({ permissions: [] })),
      ).toThrow(ForbiddenException);
    });
  });
});
