import { describe, it, expect } from "vitest";
import {
  returnDeadline,
  inReturnWindow,
  netLineAmounts,
  validateReturnTransition,
} from "../src/lib/returns-rules";
describe("Return invariants", () => {
  it("72 hours from actual delivery, inclusive deadline, no calendar midnight reset", () => {
    const t = new Date("2026-10-18T15:42:00Z");
    expect(returnDeadline(t).toISOString()).toBe("2026-10-21T15:42:00.000Z");
    expect(inReturnWindow(t, returnDeadline(t))).toBe(true);
    expect(inReturnWindow(t, new Date(+returnDeadline(t) + 1))).toBe(false);
    expect(inReturnWindow(t, new Date(+t - 1))).toBe(false);
  });
  it("VND discounts allocated deterministically and preserve total", () => {
    const items = [
      { id: "b", unitPrice: 11, quantity: 3 },
      { id: "a", unitPrice: 13, quantity: 2 },
    ];
    const n = netLineAmounts(items, 7);
    expect(Object.values(n).reduce((s, x) => s + x, 0)).toBe(52);
    expect(netLineAmounts([...items].reverse(), 7)).toEqual(n);
  });
  it("invalid totals rejected, no float or negative refund base", () => {
    expect(() =>
      netLineAmounts([{ id: "a", unitPrice: 10, quantity: 1 }], 11),
    ).toThrow();
    expect(() => netLineAmounts([], 0)).toThrow();
  });
  it("approval cannot skip receipt or inspection", () => {
    expect(() => validateReturnTransition("REQUESTED", "COMPLETED")).toThrow();
    expect(() =>
      validateReturnTransition("APPROVED", "REFUND_PENDING"),
    ).toThrow();
    expect(() =>
      validateReturnTransition("RECEIVED", "INSPECTED"),
    ).not.toThrow();
  });
  it("refund terminal state cannot be reopened", () => {
    expect(() =>
      validateReturnTransition("COMPLETED", "REFUND_PENDING"),
    ).toThrow();
    expect(() =>
      validateReturnTransition("REFUND_PENDING", "CLOSED"),
    ).not.toThrow();
  });
});
