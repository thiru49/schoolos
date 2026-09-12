import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "../decorators/require-permission.decorator";
import type { RequestAcl } from "../types/request-acl";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<string | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const req = context.switchToHttp().getRequest<{ acl?: RequestAcl }>();
    if (!req.acl) throw new ForbiddenException("ACL missing");
    if (!req.acl.permissions.includes(permission as RequestAcl["permissions"][number])) {
      throw new ForbiddenException(`Missing permission ${permission}`);
    }
    return true;
  }
}
