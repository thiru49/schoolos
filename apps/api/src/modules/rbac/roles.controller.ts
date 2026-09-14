import { Body, Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { PERMISSIONS } from "@schoolos/permissions";
import { assignRolesSchema, updateScopesSchema, userListQuerySchema } from "@schoolos/validation";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermission } from "../../common/decorators/require-permission.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";
import type { RequestAcl } from "../../common/types/request-acl";
import { RbacService } from "./rbac.service";

@Controller("roles")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rbac: RbacService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  listRoles(@CurrentUser() acl: RequestAcl) {
    return this.rbac.listRoles(acl.schoolId);
  }

  @Get("users")
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  listUsers(
    @CurrentUser() acl: RequestAcl,
    @Query() query: unknown,
  ) {
    const parsed = userListQuerySchema.parse(query);
    return this.rbac.listSchoolUsers(acl.schoolId, parsed);
  }

  @Get("users/:id")
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  getUser(
    @CurrentUser() acl: RequestAcl,
    @Param("id") id: string,
  ) {
    return this.rbac.getUserRolesAndScopes(acl.schoolId, id);
  }

  @Put("users/:id/roles")
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  assignRoles(
    @CurrentUser() acl: RequestAcl,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = assignRolesSchema.parse(body);
    return this.rbac.assignRoles(acl, id, parsed);
  }

  @Put("users/:id/scopes")
  @RequirePermission(PERMISSIONS.ROLES_ASSIGN)
  updateScopes(
    @CurrentUser() acl: RequestAcl,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = updateScopesSchema.parse(body);
    return this.rbac.updateScopes(acl, id, parsed);
  }
}
