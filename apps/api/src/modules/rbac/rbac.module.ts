import { Global, Module } from "@nestjs/common";
import { RbacService } from "./rbac.service";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Global()
@Module({
  providers: [RbacService, PermissionGuard, JwtAuthGuard],
  exports: [RbacService, PermissionGuard, JwtAuthGuard],
})
export class RbacModule {}
