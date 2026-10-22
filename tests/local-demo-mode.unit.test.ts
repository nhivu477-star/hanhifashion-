import { describe, it, expect, vi } from "vitest";
import { ghnProvider } from "../src/lib/shipping-providers";
import {
  ghnAvailability,
  GHNShippingProvider,
  STAGING_BASE,
} from "../src/lib/shipping-providers/ghn";
import { POST } from "../src/app/api/shipping/ghn/webhook/route";
describe("permanent local demo boundary", () => {
  it("cannot enable a carrier via environment credentials or fixture flags", async () => {
    vi.stubEnv("GHN_ENVIRONMENT", "staging");
    vi.stubEnv("GHN_STAGING_TOKEN", "synthetic-only");
    vi.stubEnv("GHN_TEST_FIXTURES", "1");
    try {
      await expect(ghnProvider()).rejects.toThrow(
        "REAL_CARRIERS_DISABLED_LOCAL_DEMO",
      );
      expect(ghnAvailability().available).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("default adapter never calls network", async () => {
    const network = vi.spyOn(globalThis, "fetch");
    try {
      const p = new GHNShippingProvider({
        base: STAGING_BASE,
        token: "synthetic",
        shopId: 1,
        pickup: {
          name: "QA",
          phone: "0912345678",
          address: "123 QA",
          province: "QA",
          ward: "QA",
        },
      });
      await expect(p.getShipment("TEST")).rejects.toThrow();
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });
  it("carrier webhook retired, no request parsing or database write", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "REAL_CARRIERS_DISABLED_LOCAL_DEMO",
    });
  });
});
