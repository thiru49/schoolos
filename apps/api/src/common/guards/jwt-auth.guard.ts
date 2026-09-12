import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { RequestAcl } from "../types/request-acl";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ acl?: RequestAcl }>();
    if (!req.acl) throw new UnauthorizedException("Authentication required");
    return true;
  }
}
