import { Module } from "@nestjs/common";
import { CommunicationsController } from "./communications.controller";
import { CommunicationsPolicy } from "./communications.policy";
import { CommunicationsService } from "./communications.service";

@Module({
  controllers: [CommunicationsController],
  providers: [CommunicationsService, CommunicationsPolicy],
  exports: [CommunicationsService, CommunicationsPolicy],
})
export class CommunicationsModule {}
