import { Injectable } from "@nestjs/common";
import type { RequestAcl } from "../../common/types/request-acl";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  sections(acl: RequestAcl) {
    return this.prisma.withSchool(acl.schoolId, async (tx) => {
      const sections = await tx.section.findMany({
        where: { schoolId: acl.schoolId },
        include: { class: true },
        orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
      });
      const schoolWide = acl.scopes.some((s) => s.type === "school");
      const allowed = new Set(
        acl.scopes.filter((s) => s.type === "section" && s.sectionId).map((s) => s.sectionId),
      );
      const filtered = schoolWide
        ? sections
        : sections.filter((s) => allowed.has(s.id));
      return filtered.map((s) => ({
        id: s.id,
        name: s.name,
        classId: s.classId,
        className: s.class.name,
        label: `${s.class.name}-${s.name}`,
      }));
    });
  }
}
