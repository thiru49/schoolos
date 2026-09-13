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

  assertReadSection(
    acl: RequestAcl,
    sectionId: string,
    classId: string,
    opts?: { selfInSection?: boolean; childInSection?: boolean },
  ) {
    if (!acl.permissions.includes(PERMISSIONS.EXAMS_READ)) {
      throw new ForbiddenException("Missing permission exams.read");
    }
    if (acl.scopes.some((s) => s.type === "school")) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    if (opts?.selfInSection) return;
    if (opts?.childInSection) return;
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

  assertViewReportCard(
    acl: RequestAcl,
    student: { id: string; sectionId: string; classId: string },
  ) {
    const staff = acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS);
    const reader = acl.permissions.includes(PERMISSIONS.MARKS_READ);
    if (!staff && !reader) {
      throw new ForbiddenException("Missing permission to view report card");
    }
    if (staff) {
      if (acl.scopes.some((s) => s.type === "school")) return;
      if (acl.scopes.some((s) => s.type === "section" && s.sectionId === student.sectionId)) return;
      if (acl.scopes.some((s) => s.type === "class" && s.classId === student.classId)) return;
      if (!reader) throw new ForbiddenException("You cannot view this report card");
    }
    if (reader) {
      if (acl.scopes.some((s) => s.type === "self" && s.studentId === student.id)) return;
      if (acl.scopes.some((s) => s.type === "children" && s.studentId === student.id)) return;
      if (staff) throw new ForbiddenException("You cannot view this report card");
      throw new ForbiddenException("You cannot view this report card");
    }
  }
}
