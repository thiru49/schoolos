import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { StudentsService } from "./students.service";

@Controller("students")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.STUDENTS_READ)
  list(
    @CurrentUser() acl: RequestAcl,
    @Query("sectionId") sectionId?: string,
    @Query("q") q?: string,
  ) {
    return this.students.list(acl, sectionId, q);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.STUDENTS_READ)
  get(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.students.get(acl, id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.STUDENTS_WRITE)
  create(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.students.create(acl, body);
  }

  @Patch(":id")
  @RequirePermission(PERMISSIONS.STUDENTS_WRITE)
  update(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.students.update(acl, id, body);
  }
}
