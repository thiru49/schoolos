import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";

export type AccessPayload = { sub: string; schoolId: string };

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccess(payload: AccessPayload): string {
    return this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access",
      expiresIn: 15 * 60,
    });
  }

  verifyAccess(token: string): AccessPayload {
    try {
      return this.jwt.verify<AccessPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access",
      });
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }

  newRefreshToken(): { raw: string; hash: string; expiresAt: Date } {
    const raw = randomBytes(48).toString("hex");
    const days = 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return { raw, hash: this.hashRefresh(raw), expiresAt };
  }

  hashRefresh(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }
}
