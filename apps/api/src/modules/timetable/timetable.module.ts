import { Module } from "@nestjs/common";
import { TimetableController } from "./timetable.controller";
import { TimetablePolicy } from "./timetable.policy";
import { TimetableService } from "./timetable.service";

@Module({
  controllers: [TimetableController],
  providers: [TimetableService, TimetablePolicy],
})
export class TimetableModule {}
