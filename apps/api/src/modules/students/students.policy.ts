import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import {
  childStudentIds,
  classScopeIds,
  hasSchoolScope,
  sectionScopeIds,
  selfStudentIds,
} from "../../common/people/school-user";

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

  canSeeSection(acl: RequestAcl, sectionId: string, classId?: string) {
    if (hasSchoolScope(acl)) return true;
    if (sectionScopeIds(acl).has(sectionId)) return true;
    if (classId && classScopeIds(acl).has(classId)) return true;
    return false;
  }

  visibleStudentIds(acl: RequestAcl) {
    return new Set([...childStudentIds(acl), ...selfStudentIds(acl)]);
  }

  assertSeeStudent(acl: RequestAcl, student: { id: string; sectionId: string; classId: string }) {
    this.assertRead(acl);
    if (hasSchoolScope(acl)) return;
    if (this.canSeeSection(acl, student.sectionId, student.classId)) return;
    if (this.visibleStudentIds(acl).has(student.id)) return;
    throw new ForbiddenException("You cannot view this student");
  }
}
