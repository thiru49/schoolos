import { Module } from "@nestjs/common";
import { AcademicsModule } from "../academics/academics.module";
import { TimetableController } from "./timetable.controller";
import { TimetablePolicy } from "./timetable.policy";
import { TimetableService } from "./timetable.service";

@Module({
  imports: [AcademicsModule],
  controllers: [TimetableController],
  providers: [TimetableService, TimetablePolicy],
})
export class TimetableModule {}
