import { ForbiddenException, Injectable } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

@Injectable()
export class AcademicsPolicy {
  private hasSchoolScope(acl: RequestAcl): boolean {
    return acl.scopes.some((s) => s.type === "school");
  }

  assertReadAcademicYears(acl: RequestAcl) {
    const canRead =
      acl.permissions.includes(PERMISSIONS.ACADEMIC_YEAR_MANAGE) ||
      acl.permissions.includes(PERMISSIONS.CLASSES_MANAGE);
    if (!canRead) {
      throw new ForbiddenException("Missing permission to read academic years");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("Academic year read requires school scope");
    }
  }

  assertManageAcademicYear(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.ACADEMIC_YEAR_MANAGE)) {
      throw new ForbiddenException("Missing permission academic_year.manage");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("Academic year management requires school scope");
    }
  }

  assertManageClasses(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.CLASSES_MANAGE)) {
      throw new ForbiddenException("Missing permission classes.manage");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("Classes management requires school scope");
    }
  }

  assertManageSubjects(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.SUBJECTS_MANAGE)) {
      throw new ForbiddenException("Missing permission subjects.manage");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("Subjects management requires school scope");
    }
  }
}
