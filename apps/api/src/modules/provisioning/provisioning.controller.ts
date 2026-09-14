import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { PlatformOwnerGuard } from "../../common/guards/platform-owner.guard";
import { ProvisioningService } from "./provisioning.service";

@Controller("platform/schools")
@UseGuards(PlatformOwnerGuard)
export class ProvisioningController {
  constructor(private readonly provisioning: ProvisioningService) {}

  @Post()
  provision(@Body() body: unknown) {
    return this.provisioning.provisionSchool(body);
  }
}
