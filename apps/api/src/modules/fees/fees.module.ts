import { Module } from "@nestjs/common";
import { FeesController } from "./fees.controller";
import { FeesPolicy } from "./fees.policy";
import { FeesService } from "./fees.service";

@Module({
  controllers: [FeesController],
  providers: [FeesService, FeesPolicy],
})
export class FeesModule {}
