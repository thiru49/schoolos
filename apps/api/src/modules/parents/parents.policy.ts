import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";
import { hasSchoolScope } from "../../common/people/school-user";

export class ParentsPolicy {
  assertRead(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.PARENTS_READ)) {
      throw new ForbiddenException("Missing permission parents.read");
    }
  }

  assertWrite(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.PARENTS_WRITE)) {
      throw new ForbiddenException("Missing permission parents.write");
    }
    if (!hasSchoolScope(acl)) {
      throw new ForbiddenException("Parent write requires school scope");
    }
  }

  assertSee(acl: RequestAcl, parent: { userId: string }) {
    this.assertRead(acl);
    if (hasSchoolScope(acl)) return;
    if (parent.userId === acl.userId) return;
    throw new ForbiddenException("You cannot view this parent");
  }

  isSelfOnly(acl: RequestAcl) {
    return !hasSchoolScope(acl);
  }
}
