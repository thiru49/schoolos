import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

export class TimetablePolicy {
  assertWrite(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.TIMETABLE_WRITE)) {
      throw new ForbiddenException("Missing permission timetable.write");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Timetable write requires school scope");
    }
  }

  assertReadSection(
    acl: RequestAcl,
    sectionId: string,
    classId: string,
    opts?: { selfInSection?: boolean; childInSection?: boolean },
  ) {
    if (!acl.permissions.includes(PERMISSIONS.TIMETABLE_READ)) {
      throw new ForbiddenException("Missing permission timetable.read");
    }
    if (acl.scopes.some((s) => s.type === "school")) return;
    if (acl.scopes.some((s) => s.type === "section" && s.sectionId === sectionId)) return;
    if (acl.scopes.some((s) => s.type === "class" && s.classId === classId)) return;
    if (opts?.selfInSection) return;
    if (opts?.childInSection) return;
    throw new ForbiddenException("You cannot read this timetable");
  }
}
