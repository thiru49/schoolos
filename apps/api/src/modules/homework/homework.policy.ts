import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

export class HomeworkPolicy {
  assertCreateSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.HOMEWORK_CREATE)) {
      throw new ForbiddenException("Missing permission homework.create");
    }
    this.assertSection(acl, sectionId, classId);
  }

  assertReadSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.HOMEWORK_READ)) {
      throw new ForbiddenException("Missing permission homework.read");
    }
    if (this.hasSchool(acl)) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    throw new ForbiddenException("You cannot read homework for this section");
  }

  assertComplete(acl: RequestAcl, studentId: string) {
    if (!acl.permissions.includes(PERMISSIONS.HOMEWORK_COMPLETE)) {
      throw new ForbiddenException("Missing permission homework.complete");
    }
    if (!acl.scopes.some((s) => s.type === "self" && s.studentId === studentId)) {
      throw new ForbiddenException("You can only complete your own homework");
    }
  }

  private assertSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (this.hasSchool(acl)) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    throw new ForbiddenException("You cannot assign homework to this section");
  }

  private hasSchool(acl: RequestAcl) {
    return acl.scopes.some((s) => s.type === "school");
  }
}
