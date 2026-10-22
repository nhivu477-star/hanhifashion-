import { describe, it, expect } from "vitest";
import {
  calculateTotals,
  normalize,
  transitions,
  categories,
} from "../src/lib/catalog";
describe("Commerce invariants", () => {
  it("Vietnamese accent insensitive matching", () =>
    expect(normalize("Áo sơ mi trắng ĐẸP")).toBe("ao so mi trang dep"));
  it("exactly 100 configured products", () =>
    expect(categories.reduce((n, c) => n + c[2], 0)).toBe(100));
  it("shipping below threshold", () =>
    expect(calculateTotals(690000)).toEqual({
      subtotal: 690000,
      discount: 0,
      shipping: 30000,
      total: 720000,
    }));
  it("free shipping at threshold", () =>
    expect(calculateTotals(1000000).shipping).toBe(0));
  it("percentage cap", () =>
    expect(
      calculateTotals(2500000, {
        type: "PERCENT",
        value: 10,
        minimum: 500000,
        maximum: 200000,
      }).discount,
    ).toBe(200000));
  it("discount can change shipping threshold", () =>
    expect(
      calculateTotals(1000000, {
        type: "PERCENT",
        value: 10,
        minimum: 0,
        maximum: null,
      }),
    ).toEqual({
      subtotal: 1000000,
      discount: 100000,
      shipping: 30000,
      total: 930000,
    }));
  it("does not discount below minimum", () =>
    expect(
      calculateTotals(400000, {
        type: "FIXED",
        value: 100000,
        minimum: 500000,
        maximum: null,
      }).discount,
    ).toBe(0));
  it("never negative total", () =>
    expect(
      calculateTotals(100000, {
        type: "FIXED",
        value: 200000,
        minimum: 0,
        maximum: null,
      }).total,
    ).toBe(30000));
  it("delivered and completed cannot cancel", () => {
    expect(transitions.DELIVERED).not.toContain("CANCELLED");
    expect(transitions.COMPLETED).toEqual([]);
  });
  it("cancelled orders cannot progress", () =>
    expect(transitions.CANCELLED).toEqual([]));
});
