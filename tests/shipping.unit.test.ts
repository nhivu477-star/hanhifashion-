import { describe, it, expect } from "vitest";
import {
  shipmentTransitions,
  validateShipmentTransition,
  settlementTotals,
} from "../src/lib/shipping-states";
describe("Shipping/COD invariants", () => {
  it("all state pairs honor explicit graph", () => {
    for (const from of Object.keys(shipmentTransitions))
      for (const to of Object.keys(shipmentTransitions)) {
        if (shipmentTransitions[from].includes(to))
          expect(() => validateShipmentTransition(from, to)).not.toThrow();
        else expect(() => validateShipmentTransition(from, to)).toThrow();
      }
  });
  it("collection is independent from remittance", () =>
    expect(settlementTotals(100, 100, 0, true)).toMatchObject({
      status: "COLLECTED",
      outstanding: 100,
      discrepancy: false,
    }));
  it("partial remittance keeps outstanding visible", () =>
    expect(settlementTotals(100, 100, 60, true)).toMatchObject({
      status: "PARTIALLY_REMITTED",
      outstanding: 40,
    }));
  it("remitted is not automatically reconciled", () =>
    expect(settlementTotals(100, 100, 100, true).status).toBe("REMITTED"));
  it("undercollection remains disputed", () =>
    expect(settlementTotals(100, 90, 90, true)).toMatchObject({
      status: "DISPUTED",
      customerOutstanding: 10,
    }));
  it("over-remittance remains disputed", () =>
    expect(settlementTotals(100, 100, 110, true)).toMatchObject({
      status: "DISPUTED",
      outstanding: 0,
    }));
});
