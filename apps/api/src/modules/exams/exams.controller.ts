import { Body, Controller, Get, Param, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { ExamsService } from "./exams.service";

@Controller("exams")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExamsController {
  constructor(private readonly exams: ExamsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.EXAMS_READ)
  list(
    @CurrentUser() acl: RequestAcl,
    @Query("sectionId") sectionId?: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.exams.list(acl, sectionId, studentId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.EXAMS_WRITE)
  create(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.exams.create(acl, body);
  }

  @Get("queue")
  @RequirePermission(PERMISSIONS.MARKS_PUBLISH)
  queue(@CurrentUser() acl: RequestAcl) {
    return this.exams.queue(acl);
  }

  @Get("report-card")
  reportCard(@CurrentUser() acl: RequestAcl, @Query("studentId") studentId?: string) {
    return this.exams.reportCard(acl, studentId);
  }

  @Post("report-card/pdf")
  enqueuePdf(@CurrentUser() acl: RequestAcl, @Body() body: { studentId?: string }) {
    return this.exams.enqueueReportCardPdf(acl, body?.studentId);
  }

  @Get("report-card/pdf")
  async downloadPdf(
    @CurrentUser() acl: RequestAcl,
    @Query("studentId") studentId: string | undefined,
    @Res() res: Response,
  ) {
    const file = await this.exams.reportCardPdfFile(acl, studentId);
    if (!file) {
      res.status(202).json({ status: "pending" });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="report-card.pdf"');
    res.send(file);
  }

  @Get(":id")
  @RequirePermission(PERMISSIONS.EXAMS_READ)
  get(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.exams.get(acl, id);
  }

  @Get(":id/marks")
  @RequirePermission(PERMISSIONS.MARKS_READ)
  entry(
    @CurrentUser() acl: RequestAcl,
    @Param("id") id: string,
    @Query("studentId") studentId?: string,
  ) {
    return this.exams.entry(acl, id, studentId);
  }

  @Put(":id/marks")
  @RequirePermission(PERMISSIONS.MARKS_DRAFT)
  draft(@CurrentUser() acl: RequestAcl, @Param("id") id: string, @Body() body: unknown) {
    return this.exams.draft(acl, id, body);
  }

  @Post(":id/marks/submit")
  @RequirePermission(PERMISSIONS.MARKS_SUBMIT)
  submit(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.exams.submit(acl, id);
  }

  @Post(":id/marks/publish")
  @RequirePermission(PERMISSIONS.MARKS_PUBLISH)
  publish(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.exams.publish(acl, id);
  }
}
