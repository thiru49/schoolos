import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { BrandingPolicy } from "./branding.policy";

const schoolAcl = (overrides: Partial<RequestAcl> = {}): RequestAcl => ({
  userId: "u1",
  schoolId: "s1",
  roles: ["school_super_admin"],
  permissions: [
    PERMISSIONS.SCHOOL_SETTINGS_READ,
    PERMISSIONS.SCHOOL_SETTINGS_UPDATE,
    PERMISSIONS.SCHOOL_BRANDING_UPDATE,
  ],
  scopes: [{ type: "school" }],
  ...overrides,
});

describe("BrandingPolicy", () => {
  const policy = new BrandingPolicy();

  describe("assertReadSettings", () => {
    it("allows school.settings.read with school scope", () => {
      expect(() =>
        policy.assertReadSettings(
          schoolAcl({ permissions: [PERMISSIONS.SCHOOL_SETTINGS_READ] }),
        ),
      ).not.toThrow();
    });

    it("denies without permission", () => {
      expect(() =>
        policy.assertReadSettings(
          schoolAcl({ permissions: [], scopes: [{ type: "school" }] }),
        ),
      ).toThrow(ForbiddenException);
    });

    it("denies without school scope", () => {
      expect(() =>
        policy.assertReadSettings(
          schoolAcl({
            permissions: [PERMISSIONS.SCHOOL_SETTINGS_READ],
            scopes: [{ type: "section", sectionId: "sec-1" }],
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe("assertUpdateSettings", () => {
    it("allows school.settings.update with school scope", () => {
      expect(() =>
        policy.assertUpdateSettings(
          schoolAcl({ permissions: [PERMISSIONS.SCHOOL_SETTINGS_UPDATE] }),
        ),
      ).not.toThrow();
    });

    it("denies read-only admin", () => {
      expect(() =>
        policy.assertUpdateSettings(
          schoolAcl({ permissions: [PERMISSIONS.SCHOOL_SETTINGS_READ] }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe("assertUpdateBranding", () => {
    it("allows school.branding.update with school scope", () => {
      expect(() =>
        policy.assertUpdateBranding(
          schoolAcl({ permissions: [PERMISSIONS.SCHOOL_BRANDING_UPDATE] }),
        ),
      ).not.toThrow();
    });

    it("denies settings read without branding permission", () => {
      expect(() =>
        policy.assertUpdateBranding(
          schoolAcl({ permissions: [PERMISSIONS.SCHOOL_SETTINGS_READ] }),
        ),
      ).toThrow(ForbiddenException);
    });
  });
});
