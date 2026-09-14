import { Module } from "@nestjs/common";
import { AcademicsController } from "./academics.controller";
import { AcademicsPolicy } from "./academics.policy";
import { AcademicsService } from "./academics.service";

@Module({
  controllers: [AcademicsController],
  providers: [AcademicsService, AcademicsPolicy],
  exports: [AcademicsService, AcademicsPolicy],
})
export class AcademicsModule {}
