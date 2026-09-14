import { Global, Module } from "@nestjs/common";
import { RbacService } from "./rbac.service";
import { RolesPolicy } from "./roles.policy";
import { RolesController } from "./roles.controller";
import { PermissionGuard } from "../../common/guards/permission.guard";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";

@Global()
@Module({
  controllers: [RolesController],
  providers: [RbacService, RolesPolicy, PermissionGuard, JwtAuthGuard],
  exports: [RbacService, RolesPolicy, PermissionGuard, JwtAuthGuard],
})
export class RbacModule {}
