import { ForbiddenException } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import type { RequestAcl } from "../../common/types/request-acl";

export class FeesPolicy {
  assertRecord(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.FEES_RECORD)) {
      throw new ForbiddenException("Missing permission fees.record");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Fee recording requires school scope");
    }
  }

  assertStructure(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.FEES_STRUCTURE_WRITE)) {
      throw new ForbiddenException("Missing permission fees.structure.write");
    }
    if (!acl.scopes.some((s) => s.type === "school")) {
      throw new ForbiddenException("Fee structure write requires school scope");
    }
  }

  assertRead(acl: RequestAcl) {
    if (
      !acl.permissions.includes(PERMISSIONS.FEES_READ) &&
      !acl.permissions.includes(PERMISSIONS.RECEIPTS_READ)
    ) {
      throw new ForbiddenException("Missing permission fees.read");
    }
  }

  assertReceiptRead(acl: RequestAcl) {
    if (!acl.permissions.includes(PERMISSIONS.RECEIPTS_READ)) {
      throw new ForbiddenException("Missing permission receipts.read");
    }
  }

  assertCanSeeStudent(acl: RequestAcl, studentId: string, linkedChildIds: string[]) {
    this.assertRead(acl);
    this.assertStudentScope(acl, studentId, linkedChildIds, "You cannot view this student's fees");
  }

  assertCanSeeReceipt(acl: RequestAcl, studentId: string, linkedChildIds: string[]) {
    this.assertReceiptRead(acl);
    this.assertStudentScope(acl, studentId, linkedChildIds, "You cannot view this receipt");
  }

  private assertStudentScope(
    acl: RequestAcl,
    studentId: string,
    linkedChildIds: string[],
    message: string,
  ) {
    if (acl.scopes.some((s) => s.type === "school")) return;
    if (acl.scopes.some((s) => s.type === "self" && s.studentId === studentId)) return;
    if (acl.scopes.some((s) => s.type === "children") && linkedChildIds.includes(studentId)) return;
    throw new ForbiddenException(message);
  }
}
