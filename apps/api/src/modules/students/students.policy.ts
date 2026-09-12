import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { hasSchoolScope, sectionScopeIds } from "../../common/people/school-user";

export class StudentsPolicy {
  assertRead(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.STUDENTS_READ)) {
      throw new ForbiddenException("Missing permission students.read");
    }
  }

  assertWrite(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.STUDENTS_WRITE)) {
      throw new ForbiddenException("Missing permission students.write");
    }
    if (!hasSchoolScope(acl)) {
      throw new ForbiddenException("Student write requires school scope");
    }
  }

  canSeeSection(acl: RequestAcl, sectionId: string) {
    if (hasSchoolScope(acl)) return true;
    return sectionScopeIds(acl).has(sectionId);
  }

  assertSeeStudent(acl: RequestAcl, student: { id: string; sectionId: string }) {
    this.assertRead(acl);
    if (hasSchoolScope(acl)) return;
    if (sectionScopeIds(acl).has(student.sectionId)) return;
    if (acl.scopes.some((s) => s.type === "self" && s.studentId === student.id)) return;
    if (acl.scopes.some((s) => s.type === "children" && s.studentId === student.id)) return;
    throw new ForbiddenException("You cannot view this student");
  }
}
