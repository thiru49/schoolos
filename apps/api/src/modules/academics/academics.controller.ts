import { Controller, Get, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { AcademicsService } from "./academics.service";

@Controller("academics")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AcademicsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get("sections")
  @RequirePermission(PERMISSIONS.ATTENDANCE_READ)
  sections(@CurrentUser() acl: RequestAcl) {
    return this.academics.sections(acl);
  }
}
