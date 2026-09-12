import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { TeachersService } from "./teachers.service";

@Controller("teachers")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.TEACHERS_READ)
  list(@CurrentUser() acl: RequestAcl, @Query("q") q?: string) {
    return this.teachers.list(acl, q);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.TEACHERS_READ)
  get(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.teachers.get(acl, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.TEACHERS_WRITE)
  create(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.teachers.create(acl, body);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.TEACHERS_WRITE)
  update(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.teachers.update(acl, id, body);
  }
}
