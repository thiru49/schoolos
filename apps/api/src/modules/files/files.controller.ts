import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { PERMISSIONS } from "@schoolos/permissions";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { FilesService } from "./files.service";
import { BrandingService } from "../branding/branding.service";

@Controller("schools/branding")
export class FilesController {
  constructor(
    private readonly files: FilesService,
    private readonly branding: BrandingService,
  ) {}

  @Post("logo")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(PERMISSIONS.SCHOOL_BRANDING_UPDATE)
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage() }))
  async logo(@CurrentUser() acl: RequestAcl, @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string }) {
    const url = await this.files.uploadLogo(
      acl.schoolId,
      file.buffer,
      file.mimetype,
      file.originalname.replace(/[^\w.-]/g, "_"),
    );
    await this.branding.setLogoUrl(acl, url);
    return { logoUrl: url };
  }
}
