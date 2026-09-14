import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes } from "crypto";

export type AccessPayload = { sub: string; schoolId: string };

/** Parse env TTL strings such as `15m`, `7d` into milliseconds. */
export function parseTtlMs(raw: string | undefined, fallbackMs: number): number {
  if (!raw?.trim()) return fallbackMs;
  const match = /^(\d+)([smhd])$/i.exec(raw.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return amount * (multipliers[unit] ?? 0) || fallbackMs;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccess(payload: AccessPayload): string {
    const expiresInSec = Math.floor(
      parseTtlMs(process.env.JWT_ACCESS_TTL, 15 * 60_000) / 1000,
    );
    return this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access",
      expiresIn: expiresInSec,
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
    const ttlMs = parseTtlMs(process.env.JWT_REFRESH_TTL, 7 * 86_400_000);
    const expiresAt = new Date(Date.now() + ttlMs);
    return { raw, hash: this.hashRefresh(raw), expiresAt };
  }

  hashRefresh(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }
}
