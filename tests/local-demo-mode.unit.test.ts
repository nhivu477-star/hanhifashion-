import { describe, it, expect } from "vitest";
import { POST } from "../src/app/api/shipping/ghn/webhook/route";
describe("permanent local demo boundary", () => {
  it("carrier webhook retired, no request parsing or database write", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "REAL_CARRIERS_DISABLED_LOCAL_DEMO",
    });
  });
});
