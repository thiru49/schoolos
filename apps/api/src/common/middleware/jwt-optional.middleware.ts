import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { RbacService } from "../../modules/rbac/rbac.service";
import { AuthTokenService } from "../../modules/auth/auth-token.service";

@Injectable()
export class JwtOptionalMiddleware implements NestMiddleware {
  constructor(
    private readonly tokens: AuthTokenService,
    private readonly rbac: RbacService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();
    try {
      const payload = this.tokens.verifyAccess(header.slice("Bearer ".length));
      const acl = await this.rbac.loadAcl(payload.sub, payload.schoolId);
      (req as Request & { acl?: unknown }).acl = acl;
    } catch {
      /* unauthenticated; guards will reject protected routes */
    }
    next();
  }
}
