import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { FeesService } from "./fees.service";
import { renderReceiptPdf } from "./receipt-pdf";

@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Get("fee-heads")
  @RequirePermission(PERMISSIONS.FEES_READ)
  heads(@CurrentUser() acl: RequestAcl) {
    return this.fees.listHeads(acl);
  }

  @Post("fee-heads")
  @RequirePermission(PERMISSIONS.FEES_STRUCTURE_WRITE)
  createHead(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.fees.createHead(acl, body);
  }

  @Get("fees")
  @RequirePermission(PERMISSIONS.FEES_READ)
  list(@CurrentUser() acl: RequestAcl, @Query("studentId") studentId?: string) {
    return this.fees.list(acl, studentId);
  }

  @Get("fees/summary")
  @RequirePermission(PERMISSIONS.FEES_READ)
  summary(@CurrentUser() acl: RequestAcl, @Query("studentId") studentId?: string) {
    return this.fees.summary(acl, studentId);
  }

  @Get("fees/preview-number")
  @RequirePermission(PERMISSIONS.FEES_RECORD)
  preview(@CurrentUser() acl: RequestAcl) {
    return this.fees.previewNumber(acl);
  }

  @Post("fees")
  @RequirePermission(PERMISSIONS.FEES_RECORD)
  record(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.fees.record(acl, body);
  }

  @Get("receipts/:id")
  @RequirePermission(PERMISSIONS.RECEIPTS_READ)
  receipt(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.fees.getReceipt(acl, id);
  }

  @Get("receipts/:id/pdf")
  @RequirePermission(PERMISSIONS.RECEIPTS_READ)
  async receiptPdf(
    @CurrentUser() acl: RequestAcl,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const payload = await this.fees.getReceiptForPdf(acl, id);
    const buf = await renderReceiptPdf(payload);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="receipt-${payload.receiptNumber.replace(/\//g, "-")}.pdf"`,
    );
    res.setHeader("Content-Length", buf.length);
    res.send(buf);
  }
}
