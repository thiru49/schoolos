import { Module } from "@nestjs/common";
import { ParentsController } from "./parents.controller";
import { ParentsPolicy } from "./parents.policy";
import { ParentsService } from "./parents.service";

@Module({
  controllers: [ParentsController],
  providers: [ParentsService, ParentsPolicy],
})
export class ParentsModule {}
