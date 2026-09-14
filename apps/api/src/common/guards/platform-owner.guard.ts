import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import type { Request } from "express";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

@Injectable()
export class PlatformOwnerGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const configured = this.config.get<string>("PLATFORM_OWNER_API_KEY");
    if (!configured) {
      throw new ForbiddenException("Platform provisioning is not configured");
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = req.headers["x-platform-api-key"];
    if (typeof provided !== "string" || !safeEqual(provided, configured)) {
      throw new UnauthorizedException("Platform authentication required");
    }
    return true;
  }
}
