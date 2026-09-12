import { Module } from "@nestjs/common";
import { HomeworkController } from "./homework.controller";
import { HomeworkPolicy } from "./homework.policy";
import { HomeworkService } from "./homework.service";

@Module({
  controllers: [HomeworkController],
  providers: [HomeworkService, HomeworkPolicy],
})
export class HomeworkModule {}
