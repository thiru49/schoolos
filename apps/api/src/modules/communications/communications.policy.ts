import { ForbiddenException, Injectable } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

@Injectable()
export class CommunicationsPolicy {
  assertReadNotices(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.NOTICES_READ)) {
      throw new ForbiddenException("Missing permission notices.read");
    }
  }

  assertWriteNotices(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.NOTICES_WRITE)) {
      throw new ForbiddenException("Missing permission notices.write");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Notices write requires school scope");
    }
  }

  assertReadEvents(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.EVENTS_READ)) {
      throw new ForbiddenException("Missing permission events.read");
    }
  }

  assertWriteEvents(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.EVENTS_WRITE)) {
      throw new ForbiddenException("Missing permission events.write");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Events write requires school scope");
    }
  }

  assertReadHolidays(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.NOTICES_READ)) {
      throw new ForbiddenException("Missing permission notices.read");
    }
  }

  assertManageHolidays(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.HOLIDAYS_MANAGE)) {
      throw new ForbiddenException("Missing permission holidays.manage");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Holidays manage requires school scope");
    }
  }
}
