import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { ParentsService } from "./parents.service";

@Controller("parents")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ParentsController {
  constructor(private readonly parents: ParentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.PARENTS_READ)
  list(@CurrentUser() acl: RequestAcl, @Query("q") q?: string) {
    return this.parents.list(acl, q);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.PARENTS_READ)
  get(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.parents.get(acl, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.PARENTS_WRITE)
  create(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.parents.create(acl, body);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.PARENTS_WRITE)
  update(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.parents.update(acl, id, body);
  }

  @Post(":id/children")
  @RequirePermission(PERMISSIONS.PARENTS_WRITE)
  link(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.parents.link(acl, id, body);
  }

  @Delete(":id/children/:studentId")
  @RequirePermission(PERMISSIONS.PARENTS_WRITE)
  unlink(
    @CurrentUser() acl: RequestAcl,
    @Param("id") id: string,
    @Param("studentId") studentId: string,
  ) {
    return this.parents.unlink(acl, id, studentId);
  }
}
