import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionCookieSecure } from "../src/lib/auth";

afterEach(() => vi.unstubAllEnvs());

describe("Session cookie transport security", () => {
  it("allows plain HTTP only for exact loopback hosts in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const host of ["localhost", "localhost:3000", "LOCALHOST:3102", "127.0.0.1", "127.0.0.1:3102", "[::1]", "[::1]:3102"])
      expect(sessionCookieSecure(host), host).toBe(false);
  });

  it("retains Secure for nonloopback, missing, deceptive or malformed production hosts", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const host of [null, "", "fashion.example", "fashion.example:443", "192.168.1.2:3000", "localhost.example", "127.0.0.1.example", "localhost@fashion.example", "localhost, fashion.example", "127.1", "2130706433", "::1", "[::ffff:127.0.0.1]", "localhost.", " localhost", "localhost:65536", "localhost:123456", "https://localhost", "localhost/", "localhost:abc"])
      expect(sessionCookieSecure(host), String(host)).toBe(true);
  });

  it("preserves development HTTP behavior", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookieSecure("localhost:3000")).toBe(false);
    expect(sessionCookieSecure("fashion.example")).toBe(false);
  });
});
