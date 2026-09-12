import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { BrandingService } from "./branding.service";

@Controller()
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Get("public/tenants/:slug/branding")
  publicBranding(@Param("slug") slug: string) {
    return this.branding.publicBySlug(slug);
  }

  @Patch("schools/branding")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.SCHOOL_BRANDING_UPDATE)
  update(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.branding.update(acl.schoolId, body);
  }
}
