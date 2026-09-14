import { ForbiddenException, Injectable } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

@Injectable()
export class BrandingPolicy {
  private hasSchoolScope(acl: RequestAcl): boolean {
    return acl.scopes.some((s) => s.type === "school");
  }

  assertReadSettings(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_READ)) {
      throw new ForbiddenException("Missing permission school.settings.read");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("School settings read requires school scope");
    }
  }

  assertUpdateSettings(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_UPDATE)) {
      throw new ForbiddenException("Missing permission school.settings.update");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("School settings update requires school scope");
    }
  }

  assertUpdateBranding(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.SCHOOL_BRANDING_UPDATE)) {
      throw new ForbiddenException("Missing permission school.branding.update");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("School branding update requires school scope");
    }
  }
}
