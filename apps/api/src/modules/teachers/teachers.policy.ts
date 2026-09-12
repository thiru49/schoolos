import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { hasSchoolScope } from "../../common/people/school-user";

export class TeachersPolicy {
  assertRead(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.TEACHERS_READ)) {
      throw new ForbiddenException("Missing permission teachers.read");
    }
  }

  assertWrite(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.TEACHERS_WRITE)) {
      throw new ForbiddenException("Missing permission teachers.write");
    }
    if (!hasSchoolScope(acl)) {
      throw new ForbiddenException("Teacher write requires school scope");
    }
  }

  assertSee(acl: RequestAcl, teacher: { userId: string }) {
    this.assertRead(acl);
    if (hasSchoolScope(acl)) return;
    if (teacher.userId === acl.userId) return;
    throw new ForbiddenException("You cannot view this teacher");
  }

  isSelfOnly(acl: RequestAcl) {
    return !hasSchoolScope(acl);
  }
}
