import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { FeesPolicy } from "./fees.policy";

const schoolAcl = (overrides: Partial<RequestAcl> = {}): RequestAcl => ({
  userId: "u1",
  schoolId: "s1",
  roles: ["accounts_admin"],
  permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.FEES_STRUCTURE_WRITE, PERMISSIONS.FEES_RECORD, PERMISSIONS.RECEIPTS_READ],
  scopes: [{ type: "school" }],
  ...overrides,
});

describe("FeesPolicy", () => {
  const policy = new FeesPolicy();

  // ─── assertRead ──────────────────────────────────────────────────────────────

  describe("assertRead", () => {
    it("allows fees.read with school scope", () => {
      expect(() => policy.assertRead(schoolAcl())).not.toThrow();
    });

    it("allows fees.read with children scope (parent)", () => {
      const acl = schoolAcl({
        roles: ["parent"],
        permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "children", studentId: "st1" }],
      });
      expect(() => policy.assertRead(acl)).not.toThrow();
    });

    it("allows fees.read with self scope (student)", () => {
      const acl = schoolAcl({
        roles: ["student"],
        permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "self", studentId: "st1" }],
      });
      expect(() => policy.assertRead(acl)).not.toThrow();
    });

    it("denies when fees.read is missing even with receipts.read", () => {
      // receipts.read alone must NOT grant access to fee lists/summaries
      const acl = schoolAcl({
        permissions: [PERMISSIONS.RECEIPTS_READ],
      });
      expect(() => policy.assertRead(acl)).toThrow(ForbiddenException);
    });

    it("denies teacher without fees.read", () => {
      const acl = schoolAcl({
        roles: ["teacher"],
        permissions: [],
        scopes: [{ type: "section", sectionId: "sec-8a" }],
      });
      expect(() => policy.assertRead(acl)).toThrow(ForbiddenException);
    });

    it("denies empty permissions", () => {
      expect(() => policy.assertRead(schoolAcl({ permissions: [] }))).toThrow(ForbiddenException);
    });
  });

  // ─── assertStructure ─────────────────────────────────────────────────────────

  describe("assertStructure", () => {
    it("allows fees.structure.write with school scope", () => {
      const acl = schoolAcl({ permissions: [PERMISSIONS.FEES_STRUCTURE_WRITE] });
      expect(() => policy.assertStructure(acl)).not.toThrow();
    });

    it("denies missing fees.structure.write permission", () => {
      const acl = schoolAcl({ permissions: [] });
      expect(() => policy.assertStructure(acl)).toThrow(ForbiddenException);
    });

    it("denies fees.structure.write without school scope", () => {
      const acl = schoolAcl({
        permissions: [PERMISSIONS.FEES_STRUCTURE_WRITE],
        scopes: [{ type: "section", sectionId: "sec-8a" }],
      });
      expect(() => policy.assertStructure(acl)).toThrow(ForbiddenException);
    });

    it("denies teacher with fees.structure.write but section scope only", () => {
      const acl: RequestAcl = {
        userId: "t1",
        schoolId: "s1",
        roles: ["teacher"],
        permissions: [PERMISSIONS.FEES_STRUCTURE_WRITE],
        scopes: [{ type: "section", sectionId: "sec-8a" }],
      };
      expect(() => policy.assertStructure(acl)).toThrow(ForbiddenException);
    });
  });

  // ─── assertRecord ────────────────────────────────────────────────────────────

  describe("assertRecord", () => {
    it("allows fees.record with school scope", () => {
      const acl = schoolAcl({ permissions: [PERMISSIONS.FEES_RECORD] });
      expect(() => policy.assertRecord(acl)).not.toThrow();
    });

    it("denies missing fees.record permission", () => {
      const acl = schoolAcl({ permissions: [] });
      expect(() => policy.assertRecord(acl)).toThrow(ForbiddenException);
    });

    it("denies fees.record without school scope", () => {
      const acl = schoolAcl({
        permissions: [PERMISSIONS.FEES_RECORD],
        scopes: [{ type: "section", sectionId: "sec-8a" }],
      });
      expect(() => policy.assertRecord(acl)).toThrow(ForbiddenException);
    });

    it("denies teacher recording fees (no permission, section scope)", () => {
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

  // ─── assertReceiptRead ───────────────────────────────────────────────────────

  describe("assertReceiptRead", () => {
    it("allows receipts.read", () => {
      const acl = schoolAcl({ permissions: [PERMISSIONS.RECEIPTS_READ] });
      expect(() => policy.assertReceiptRead(acl)).not.toThrow();
    });

    it("denies when only fees.read present (not receipts.read)", () => {
      const acl = schoolAcl({ permissions: [PERMISSIONS.FEES_READ] });
      expect(() => policy.assertReceiptRead(acl)).toThrow(ForbiddenException);
    });

    it("denies teacher without receipts.read", () => {
      const acl: RequestAcl = {
        userId: "t1",
        schoolId: "s1",
        roles: ["teacher"],
        permissions: [PERMISSIONS.FEES_READ],
        scopes: [{ type: "school" }],
      };
      expect(() => policy.assertReceiptRead(acl)).toThrow(ForbiddenException);
    });
  });

  // ─── assertCanSeeStudent ─────────────────────────────────────────────────────

  describe("assertCanSeeStudent", () => {
    it("allows school-scope user for any student", () => {
      const acl = schoolAcl({ permissions: [PERMISSIONS.FEES_READ] });
      expect(() => policy.assertCanSeeStudent(acl, "st-any", [])).not.toThrow();
    });

    it("allows parent with children scope for linked child", () => {
      const acl: RequestAcl = {
        userId: "p1",
        schoolId: "s1",
        roles: ["parent"],
        permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "children", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeStudent(acl, "st1", ["st1"])).not.toThrow();
    });

    it("denies parent reading another child's fees (unlinked)", () => {
      const acl: RequestAcl = {
        userId: "p1",
        schoolId: "s1",
        roles: ["parent"],
        permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "children", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeStudent(acl, "st2", ["st1"])).toThrow(ForbiddenException);
    });

    it("allows student with self scope to view own fees", () => {
      const acl: RequestAcl = {
        userId: "u-st1",
        schoolId: "s1",
        roles: ["student"],
        permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "self", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeStudent(acl, "st1", [])).not.toThrow();
    });

    it("denies student with self scope viewing another student's fees", () => {
      const acl: RequestAcl = {
        userId: "u-st1",
        schoolId: "s1",
        roles: ["student"],
        permissions: [PERMISSIONS.FEES_READ, PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "self", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeStudent(acl, "st2", [])).toThrow(ForbiddenException);
    });

    it("denies user with fees.read but no matching scope (section only)", () => {
      const acl: RequestAcl = {
        userId: "t1",
        schoolId: "s1",
        roles: ["teacher"],
        permissions: [PERMISSIONS.FEES_READ],
        scopes: [{ type: "section", sectionId: "sec-8a" }],
      };
      expect(() => policy.assertCanSeeStudent(acl, "st1", [])).toThrow(ForbiddenException);
    });

    it("denies when fees.read is missing entirely", () => {
      const acl: RequestAcl = {
        userId: "p1",
        schoolId: "s1",
        roles: ["parent"],
        permissions: [],
        scopes: [{ type: "children", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeStudent(acl, "st1", ["st1"])).toThrow(ForbiddenException);
    });
  });

  // ─── assertCanSeeReceipt ─────────────────────────────────────────────────────

  describe("assertCanSeeReceipt", () => {
    it("allows school-scope staff with receipts.read", () => {
      const acl = schoolAcl({ permissions: [PERMISSIONS.RECEIPTS_READ] });
      expect(() => policy.assertCanSeeReceipt(acl, "st-any", [])).not.toThrow();
    });

    it("allows parent with receipts.read for linked child receipt", () => {
      const acl: RequestAcl = {
        userId: "p1",
        schoolId: "s1",
        roles: ["parent"],
        permissions: [PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "children", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeReceipt(acl, "st1", ["st1"])).not.toThrow();
    });

    it("denies parent reading another child's receipt", () => {
      const acl: RequestAcl = {
        userId: "p1",
        schoolId: "s1",
        roles: ["parent"],
        permissions: [PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "children", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeReceipt(acl, "st2", ["st1"])).toThrow(ForbiddenException);
    });

    it("allows student with self scope for own receipt", () => {
      const acl: RequestAcl = {
        userId: "u-st1",
        schoolId: "s1",
        roles: ["student"],
        permissions: [PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "self", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeReceipt(acl, "st1", [])).not.toThrow();
    });

    it("denies student with self scope reading another student's receipt", () => {
      const acl: RequestAcl = {
        userId: "u-st1",
        schoolId: "s1",
        roles: ["student"],
        permissions: [PERMISSIONS.RECEIPTS_READ],
        scopes: [{ type: "self", studentId: "st1" }],
      };
      expect(() => policy.assertCanSeeReceipt(acl, "st2", [])).toThrow(ForbiddenException);
    });

    it("denies teacher without receipts.read even with school scope", () => {
      const acl: RequestAcl = {
        userId: "t1",
        schoolId: "s1",
        roles: ["teacher"],
        permissions: [PERMISSIONS.FEES_READ],
        scopes: [{ type: "school" }],
      };
      expect(() => policy.assertCanSeeReceipt(acl, "st1", [])).toThrow(ForbiddenException);
    });
  });
});
