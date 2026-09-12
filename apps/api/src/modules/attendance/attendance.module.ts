import { Module } from "@nestjs/common";
import { AttendanceController } from "./attendance.controller";
import { AttendancePolicy } from "./attendance.policy";
import { AttendanceRepository } from "./attendance.repository";
import { AttendanceService } from "./attendance.service";

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository, AttendancePolicy],
})
export class AttendanceModule {}
