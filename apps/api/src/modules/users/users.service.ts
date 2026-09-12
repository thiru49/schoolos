import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { selectChildSchema } from "@schoolos/validation";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";
import { RbacService } from "../rbac/rbac.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async me(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: acl.userId, schoolId: acl.schoolId },
      });
      if (!user) throw new NotFoundException("User not found");
      return {
        id: user.id,
        displayName: user.displayName,
        identifier: user.identifier,
        schoolId: user.schoolId,
      };
    });
  }

  acl(acl: RequestAcl) {
    return this.rbac.loadAcl(acl.userId, acl.schoolId);
  }

  async children(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const parent = await tx.parent.findFirst({
        where: { userId: acl.userId, schoolId: acl.schoolId },
        include: {
          children: { include: { student: { include: { class: true, section: true } } } },
        },
      });
      if (!parent) return [];
      return parent.children.map((c) => ({
        studentId: c.student.id,
        fullName: c.student.fullName,
        admissionNumber: c.student.admissionNumber,
        className: c.student.class.name,
        sectionName: c.student.section.name,
      }));
    });
  }

  async selectChild(acl: RequestAcl, body: unknown) {
    const input = selectChildSchema.parse(body);
    const kids = await this.children(acl);
    const found = kids.find((k) => k.studentId === input.studentId);
    if (!found) throw new ForbiddenException("Student is not linked to this parent");
    return { studentId: found.studentId };
  }
}
