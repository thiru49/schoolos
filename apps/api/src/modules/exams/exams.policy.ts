import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

export class ExamsPolicy {
  assertWrite(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.EXAMS_WRITE)) {
      throw new ForbiddenException("Missing permission exams.write");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Exam write requires school scope");
    }
  }

  assertReadSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.EXAMS_READ)) {
      throw new ForbiddenException("Missing permission exams.read");
    }
    if (acl.scopes.some((s) => s.type === "school")) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    throw new ForbiddenException("You cannot read this exam");
  }

  assertDraftSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.MARKS_DRAFT)) {
      throw new ForbiddenException("Missing permission marks.draft");
    }
    if (acl.scopes.some((s) => s.type === "school")) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    throw new ForbiddenException("You cannot draft marks for this section");
  }

  assertSubmitSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.MARKS_SUBMIT)) {
      throw new ForbiddenException("Missing permission marks.submit");
    }
    if (acl.scopes.some((s) => s.type === "school")) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    throw new ForbiddenException("You cannot submit marks for this section");
  }

  assertPublish(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.MARKS_PUBLISH)) {
      throw new ForbiddenException("Missing permission marks.publish");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Marks publish requires school scope");
    }
  }
}
