import { Module } from "@nestjs/common";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";
import { BrandingModule } from "../branding/branding.module";

@Module({
  imports: [BrandingModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
