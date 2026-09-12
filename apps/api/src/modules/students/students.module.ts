import { Module } from "@nestjs/common";
import { StudentsController } from "./students.controller";
import { StudentsPolicy } from "./students.policy";
import { StudentsService } from "./students.service";

@Module({
  controllers: [StudentsController],
  providers: [StudentsService, StudentsPolicy],
})
export class StudentsModule {}
