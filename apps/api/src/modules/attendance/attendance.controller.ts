import { Body, Controller, Get, Put, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
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

  @Get("report")
  @RequirePermission(PERMISSIONS.REPORTS_ATTENDANCE)
  report(@CurrentUser() acl: RequestAcl, @Query() query: unknown) {
    return this.attendance.report(acl, query);
  }

  @Get("export")
  @RequirePermission(PERMISSIONS.REPORTS_ATTENDANCE)
  async exportCsv(@CurrentUser() acl: RequestAcl, @Query() query: unknown, @Res() res: Response) {
    const csv = await this.attendance.exportCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="attendance.csv"');
    res.send(csv);
  }

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
