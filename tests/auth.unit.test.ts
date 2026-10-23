import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, sessionCookieSecure } from "../src/lib/auth";

const { tx, setCookie, adopt } = vi.hoisted(() => ({
  tx: {
    user: { updateMany: vi.fn() },
    session: { create: vi.fn() },
  },
  setCookie: vi.fn(),
  adopt: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({
  db: { $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx) },
}));
vi.mock("../src/lib/localization/server", () => ({ adoptPreferences: adopt }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: setCookie }),
  headers: async () => new Headers({ host: "localhost:3000" }),
}));

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

describe("Credential-bound session creation", () => {
  const authenticated = { id: "customer", passwordHash: "verified-hash", permissionVersion: 3 };
  it("rejects stale authenticated credentials without issuing a session or cookie", async () => {
    vi.clearAllMocks();
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(createSession(authenticated)).rejects.toThrow();
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: {
        ...authenticated,
        active: true,
        role: { in: ["CUSTOMER", "SELLER", "ADMIN"] },
      },
      data: { lastLoginAt: expect.any(Date) },
    });
    expect(tx.session.create).not.toHaveBeenCalled();
    expect(setCookie).not.toHaveBeenCalled();
    expect(adopt).not.toHaveBeenCalled();
  });
  it("creates a hash-only session bound to the verified account version", async () => {
    vi.clearAllMocks();
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    await createSession(authenticated);
    expect(tx.session.create).toHaveBeenCalledWith({
      data: {
        userId: authenticated.id, permissionVersion: authenticated.permissionVersion,
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/), expiresAt: expect.any(Date),
      },
    });
    expect(setCookie).toHaveBeenCalledWith("hn_session", expect.any(String), expect.objectContaining({ httpOnly: true }));
    const rawToken = setCookie.mock.calls[0][1];
    expect(tx.session.create.mock.calls[0][0].data.tokenHash).not.toBe(rawToken);
  });
});
