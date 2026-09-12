import { Body, Controller, Get, Put, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { AttendanceService } from "./attendance.service";

@Controller("attendance")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get("roster")
  @RequirePermission(PERMISSIONS.ATTENDANCE_READ)
  roster(@CurrentUser() acl: RequestAcl, @Query() query: unknown) {
    return this.attendance.roster(acl, query);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ATTENDANCE_READ)
  list(@CurrentUser() acl: RequestAcl, @Query() query: unknown) {
    return this.attendance.list(acl, query);
  }

  @Put()
  @RequirePermission(PERMISSIONS.ATTENDANCE_MARK)
  mark(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.attendance.mark(acl, body);
  }
}
