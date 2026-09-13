import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { CommunicationsService } from "./communications.service";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class CommunicationsController {
  constructor(private readonly communications: CommunicationsService) {}

  // --- NOTICES ---

  @Get("notices")
  @RequirePermission(PERMISSIONS.NOTICES_READ)
  listNotices(@CurrentUser() acl: RequestAcl) {
    return this.communications.listNotices(acl);
  }

  @Post("notices")
  @RequirePermission(PERMISSIONS.NOTICES_WRITE)
  createNotice(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.communications.createNotice(acl, body);
  }

  @Patch("notices/:id")
  @RequirePermission(PERMISSIONS.NOTICES_WRITE)
  updateNotice(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.communications.updateNotice(acl, id, body);
  }

  @Delete("notices/:id")
  @RequirePermission(PERMISSIONS.NOTICES_WRITE)
  removeNotice(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.communications.removeNotice(acl, id);
  }

  // --- EVENTS ---

  @Get("events")
  @RequirePermission(PERMISSIONS.EVENTS_READ)
  listEvents(
    @CurrentUser() acl: RequestAcl,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.communications.listEvents(acl, from, to);
  }

  @Post("events")
  @RequirePermission(PERMISSIONS.EVENTS_WRITE)
  createEvent(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.communications.createEvent(acl, body);
  }

  @Patch("events/:id")
  @RequirePermission(PERMISSIONS.EVENTS_WRITE)
  updateEvent(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.communications.updateEvent(acl, id, body);
  }

  @Delete("events/:id")
  @RequirePermission(PERMISSIONS.EVENTS_WRITE)
  removeEvent(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.communications.removeEvent(acl, id);
  }

  // --- HOLIDAYS ---

  @Get("holidays")
  @RequirePermission(PERMISSIONS.NOTICES_READ)
  listHolidays(
    @CurrentUser() acl: RequestAcl,
    @Query("academicYearId") academicYearId?: string,
  ) {
    return this.communications.listHolidays(acl, academicYearId);
  }

  @Post("holidays")
  @RequirePermission(PERMISSIONS.HOLIDAYS_MANAGE)
  createHoliday(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.communications.createHoliday(acl, body);
  }

  @Delete("holidays/:id")
  @RequirePermission(PERMISSIONS.HOLIDAYS_MANAGE)
  removeHoliday(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.communications.removeHoliday(acl, id);
  }
}
