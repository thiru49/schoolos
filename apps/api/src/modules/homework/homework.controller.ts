import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { HomeworkService } from "./homework.service";

@Controller("homework")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class HomeworkController {
  constructor(private readonly homework: HomeworkService) {}

  @Get()
  @RequirePermission(PERMISSIONS.HOMEWORK_READ)
  list(
    @CurrentUser() acl: RequestAcl,
    @Query("sectionId") sectionId?: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.homework.list(acl, sectionId, studentId);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.HOMEWORK_READ)
  get(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.homework.get(acl, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.HOMEWORK_CREATE)
  create(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.homework.create(acl, body);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.HOMEWORK_CREATE)
  update(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.homework.update(acl, id, body);
  }

  @Post(":id/complete")
  @RequirePermission(PERMISSIONS.HOMEWORK_COMPLETE)
  complete(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.homework.complete(acl, id);
  }
}
