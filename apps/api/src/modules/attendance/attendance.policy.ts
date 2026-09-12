import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

export class AttendancePolicy {
  assertCanMarkSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.ATTENDANCE_MARK)) {
      throw new ForbiddenException("Missing permission attendance.mark");
    }
    if (this.hasSchoolScope(acl)) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    throw new ForbiddenException("You cannot mark this section");
  }

  assertCanReadSection(acl: RequestAcl, sectionId: string, classId: string) {
    if (!acl.permissions.includes(PERMISSIONS.ATTENDANCE_READ)) {
      throw new ForbiddenException("Missing permission attendance.read");
    }
    if (this.hasSchoolScope(acl)) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    throw new ForbiddenException("You cannot read this section");
  }

  assertCanReadStudent(
    acl: RequestAcl,
    student: { id: string; sectionId: string; classId: string },
    linkedChildIds: string[],
  ) {
    if (!acl.permissions.includes(PERMISSIONS.ATTENDANCE_READ)) {
      throw new ForbiddenException("Missing permission attendance.read");
    }
    if (this.hasSchoolScope(acl)) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === student.sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === student.classId)) return;
    if (acl.scopes.some((s) => s.type === "self" && s.studentId === student.id)) return;
    if (acl.scopes.some((s) => s.type === "children") && linkedChildIds.includes(student.id)) {
      return;
    }
    throw new ForbiddenException("You cannot read this student");
  }

  private hasSchoolScope(acl: RequestAcl) {
    return acl.scopes.some((s) => s.type === "school");
  }
}
