import { BadRequestException, Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { AttendanceService } from "../attendance/attendance.service";
import { ReportsService } from "./reports.service";
import {
  feeCollectionReportQuerySchema,
  paymentReportQuerySchema,
  progressReportQuerySchema,
  studentListReportQuerySchema,
  teacherWorkloadReportQuerySchema,
} from "./dto/reports-query.dto";

function parseQuery<T>(
  schema: {
    safeParse: (data: unknown) =>
      | { success: true; data: T }
      | { success: false; error: { issues: Array<{ message: string }> } };
  },
  raw: unknown,
): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

@Controller("reports")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly attendance: AttendanceService,
  ) {}

  @Get("available")
  available(@CurrentUser() acl: RequestAcl) {
    return this.reports.getAvailableReports(acl);
  }

  // --- Fee Collection Report ---
  @Get("fees/collection")
  @RequirePermission(PERMISSIONS.REPORTS_FEES)
  feeCollection(@CurrentUser() acl: RequestAcl, @Query() rawQuery: unknown) {
    const query = parseQuery(feeCollectionReportQuerySchema, rawQuery);
    return this.reports.getFeeCollectionReport(acl, query);
  }

  @Get("fees/collection/export")
  @RequirePermission(PERMISSIONS.REPORTS_FEES)
  async exportFeeCollection(
    @CurrentUser() acl: RequestAcl,
    @Query() rawQuery: unknown,
    @Res() res: Response,
  ) {
    const query = parseQuery(feeCollectionReportQuerySchema, rawQuery);
    const csv = await this.reports.exportFeeCollectionCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="fee-collection.csv"');
    res.send(csv);
  }

  // --- Payment Transactions Report ---
  @Get("fees/payments")
  @RequirePermission(PERMISSIONS.REPORTS_FEES)
  payments(@CurrentUser() acl: RequestAcl, @Query() rawQuery: unknown) {
    const query = parseQuery(paymentReportQuerySchema, rawQuery);
    return this.reports.getPaymentReport(acl, query);
  }

  @Get("fees/payments/export")
  @RequirePermission(PERMISSIONS.REPORTS_FEES)
  async exportPayments(
    @CurrentUser() acl: RequestAcl,
    @Query() rawQuery: unknown,
    @Res() res: Response,
  ) {
    const query = parseQuery(paymentReportQuerySchema, rawQuery);
    const csv = await this.reports.exportPaymentsCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="payments-report.csv"');
    res.send(csv);
  }

  // --- Student List Report ---
  @Get("students")
  @RequirePermission(PERMISSIONS.REPORTS_PROGRESS)
  students(@CurrentUser() acl: RequestAcl, @Query() rawQuery: unknown) {
    const query = parseQuery(studentListReportQuerySchema, rawQuery);
    return this.reports.getStudentListReport(acl, query);
  }

  @Get("students/export")
  @RequirePermission(PERMISSIONS.REPORTS_PROGRESS)
  async exportStudents(
    @CurrentUser() acl: RequestAcl,
    @Query() rawQuery: unknown,
    @Res() res: Response,
  ) {
    const query = parseQuery(studentListReportQuerySchema, rawQuery);
    const csv = await this.reports.exportStudentListCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="student-list.csv"');
    res.send(csv);
  }

  // --- Teacher Workload Report ---
  @Get("teachers/workload")
  @RequirePermission(PERMISSIONS.REPORTS_PROGRESS)
  teacherWorkload(@CurrentUser() acl: RequestAcl, @Query() rawQuery: unknown) {
    const query = parseQuery(teacherWorkloadReportQuerySchema, rawQuery);
    return this.reports.getTeacherWorkloadReport(acl, query);
  }

  @Get("teachers/workload/export")
  @RequirePermission(PERMISSIONS.REPORTS_PROGRESS)
  async exportTeacherWorkload(
    @CurrentUser() acl: RequestAcl,
    @Query() rawQuery: unknown,
    @Res() res: Response,
  ) {
    const query = parseQuery(teacherWorkloadReportQuerySchema, rawQuery);
    const csv = await this.reports.exportTeacherWorkloadCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="teacher-workload.csv"');
    res.send(csv);
  }

  // --- Progress / Tabulation Report ---
  @Get("progress")
  @RequirePermission(PERMISSIONS.REPORTS_PROGRESS)
  progress(@CurrentUser() acl: RequestAcl, @Query() rawQuery: unknown) {
    const query = parseQuery(progressReportQuerySchema, rawQuery);
    return this.reports.getProgressReport(acl, query);
  }

  @Get("progress/export")
  @RequirePermission(PERMISSIONS.REPORTS_PROGRESS)
  async exportProgress(
    @CurrentUser() acl: RequestAcl,
    @Query() rawQuery: unknown,
    @Res() res: Response,
  ) {
    const query = parseQuery(progressReportQuerySchema, rawQuery);
    const csv = await this.reports.exportProgressCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="progress-tabulation.csv"');
    res.send(csv);
  }

  // --- Attendance Delegation ---
  @Get("attendance")
  @RequirePermission(PERMISSIONS.REPORTS_ATTENDANCE)
  attendanceReport(@CurrentUser() acl: RequestAcl, @Query() query: unknown) {
    return this.attendance.report(acl, query);
  }

  @Get("attendance/export")
  @RequirePermission(PERMISSIONS.REPORTS_ATTENDANCE)
  async exportAttendance(
    @CurrentUser() acl: RequestAcl,
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    const csv = await this.attendance.exportCsv(acl, query);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="attendance-report.csv"');
    res.send(csv);
  }
}
