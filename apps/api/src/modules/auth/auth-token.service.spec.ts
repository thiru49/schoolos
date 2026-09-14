import { describe, expect, it } from "vitest";
import { parseTtlMs } from "./auth-token.service";

describe("parseTtlMs", () => {
  it("parses minutes", () => {
    expect(parseTtlMs("15m", 0)).toBe(15 * 60_000);
  });

  it("parses days", () => {
    expect(parseTtlMs("7d", 0)).toBe(7 * 86_400_000);
  });

  it("falls back when invalid", () => {
    expect(parseTtlMs("invalid", 1234)).toBe(1234);
  });
});
