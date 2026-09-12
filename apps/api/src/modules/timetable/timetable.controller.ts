import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { TimetableService } from "./timetable.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get("subjects")
  @RequirePermission(PERMISSIONS.TIMETABLE_READ)
  subjects(@CurrentUser() acl: RequestAcl) {
    return this.timetable.listSubjects(acl);
  }

  @Post("subjects")
  @RequirePermission(PERMISSIONS.SUBJECTS_MANAGE)
  createSubject(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.timetable.createSubject(acl, body);
  }

  @Get("timetable")
  @RequirePermission(PERMISSIONS.TIMETABLE_READ)
  list(
    @CurrentUser() acl: RequestAcl,
    @Query("sectionId") sectionId?: string,
    @Query("weekday") weekday?: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.timetable.list(acl, sectionId, weekday ? Number(weekday) : undefined, studentId);
  }

  @Post("timetable")
  @RequirePermission(PERMISSIONS.TIMETABLE_WRITE)
  create(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.timetable.createPeriod(acl, body);
  }

  @Post("timetable/publish")
  @RequirePermission(PERMISSIONS.TIMETABLE_WRITE)
  publish(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.timetable.publish(acl, body);
  }

  @Delete("timetable/:id")
  @RequirePermission(PERMISSIONS.TIMETABLE_WRITE)
  remove(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.timetable.remove(acl, id);
  }
}
