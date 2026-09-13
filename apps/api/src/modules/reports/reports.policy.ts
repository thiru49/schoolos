import { ForbiddenException, Injectable } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

@Injectable()
export class ReportsPolicy {
  assertCanAccessFeeReports(acl: RequestAcl): void {
    if (!acl.permissions.includes(PERMISSIONS.REPORTS_FEES)) {
      throw new ForbiddenException("Missing permission reports.fees");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("Fee reports require school scope");
    }
  }

  assertCanAccessTeacherWorkload(acl: RequestAcl): void {
    if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
      throw new ForbiddenException("Missing permission reports.progress");
    }
    if (!this.hasSchoolScope(acl)) {
      throw new ForbiddenException("Teacher workload report requires school scope");
    }
  }

  assertCanAccessStudentsReport(acl: RequestAcl): void {
    if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
      throw new ForbiddenException("Missing permission reports.progress");
    }
  }

  assertCanAccessProgressReport(acl: RequestAcl): void {
    if (!acl.permissions.includes(PERMISSIONS.REPORTS_PROGRESS)) {
      throw new ForbiddenException("Missing permission reports.progress");
    }
  }

  assertCanAccessAttendanceReport(acl: RequestAcl): void {
    if (!acl.permissions.includes(PERMISSIONS.REPORTS_ATTENDANCE)) {
      throw new ForbiddenException("Missing permission reports.attendance");
    }
  }

  hasSchoolScope(acl: RequestAcl): boolean {
    return acl.scopes.some((s) => s.type === "school");
  }

  getAllowedSectionIds(acl: RequestAcl): string[] {
    return acl.scopes
      .filter((s) => s.type === "section" && Boolean(s.sectionId))
      .map((s) => s.sectionId as string);
  }

  getAllowedClassIds(acl: RequestAcl): string[] {
    return acl.scopes
      .filter((s) => s.type === "class" && Boolean(s.classId))
      .map((s) => s.classId as string);
  }
}
