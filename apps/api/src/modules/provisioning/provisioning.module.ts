import { Module } from "@nestjs/common";
import { PlatformOwnerGuard } from "../../common/guards/platform-owner.guard";
import { TenancyModule } from "../tenancy/tenancy.module";
import { ProvisioningController } from "./provisioning.controller";
import { ProvisioningService } from "./provisioning.service";

@Module({
  imports: [TenancyModule],
  controllers: [ProvisioningController],
  providers: [ProvisioningService, PlatformOwnerGuard],
})
export class ProvisioningModule {}
