import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { TenancyModule } from "../tenancy/tenancy.module";
import { RbacModule } from "../rbac/rbac.module";
import { AttendanceModule } from "../attendance/attendance.module";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { ReportsPolicy } from "./reports.policy";

@Module({
  imports: [PrismaModule, TenancyModule, RbacModule, AttendanceModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsPolicy],
  exports: [ReportsService, ReportsPolicy],
})
export class ReportsModule {}
