import { SetMetadata } from "@nestjs/common";
import type { PermissionCode } from "@schoolos/permissions";

export const PERMISSION_KEY = "permission";
export const RequirePermission = (permission: PermissionCode) =>
  SetMetadata(PERMISSION_KEY, permission);
