import { Module } from "@nestjs/common";
import { ExamsController } from "./exams.controller";
import { ExamsPolicy } from "./exams.policy";
import { ExamsService } from "./exams.service";

@Module({
  controllers: [ExamsController],
  providers: [ExamsService, ExamsPolicy],
})
export class ExamsModule {}
