import { Module } from "@nestjs/common";
import { BrandingController } from "./branding.controller";
import { BrandingPolicy } from "./branding.policy";
import { BrandingService } from "./branding.service";

@Module({
  controllers: [BrandingController],
  providers: [BrandingService, BrandingPolicy],
  exports: [BrandingService],
})
export class BrandingModule {}
