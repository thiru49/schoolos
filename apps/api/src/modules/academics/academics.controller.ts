import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
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

  @Get("years")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  listYears(@CurrentUser() acl: RequestAcl) {
    return this.academics.listAcademicYears(acl);
  }

  @Post("years")
  @RequirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  createYear(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.academics.createAcademicYear(acl, body);
  }

  @Patch("years/:id")
  @RequirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  updateYear(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.academics.updateAcademicYear(acl, id, body);
  }

  @Delete("years/:id")
  @RequirePermission(PERMISSIONS.ACADEMIC_YEAR_MANAGE)
  removeYear(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.academics.removeAcademicYear(acl, id);
  }

  @Get("classes")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  listClasses(@CurrentUser() acl: RequestAcl, @Query("academicYearId") academicYearId?: string) {
    return this.academics.listClasses(acl, academicYearId);
  }

  @Post("classes")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  createClass(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.academics.createClass(acl, body);
  }

  @Patch("classes/:id")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  updateClass(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.academics.updateClass(acl, id, body);
  }

  @Delete("classes/:id")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  removeClass(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.academics.removeClass(acl, id);
  }

  @Post("sections")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  createSection(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.academics.createSection(acl, body);
  }

  @Patch("sections/:id")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  updateSection(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.academics.updateSection(acl, id, body);
  }

  @Delete("sections/:id")
  @RequirePermission(PERMISSIONS.CLASSES_MANAGE)
  removeSection(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.academics.removeSection(acl, id);
  }

  @Get("subjects")
  @RequirePermission(PERMISSIONS.SUBJECTS_MANAGE)
  listSubjects(@CurrentUser() acl: RequestAcl) {
    return this.academics.listSubjects(acl);
  }

  @Post("subjects")
  @RequirePermission(PERMISSIONS.SUBJECTS_MANAGE)
  createSubject(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.academics.createSubject(acl, body);
  }

  @Patch("subjects/:id")
  @RequirePermission(PERMISSIONS.SUBJECTS_MANAGE)
  updateSubject(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.academics.updateSubject(acl, id, body);
  }

  @Delete("subjects/:id")
  @RequirePermission(PERMISSIONS.SUBJECTS_MANAGE)
  removeSubject(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.academics.removeSubject(acl, id);
  }
}
