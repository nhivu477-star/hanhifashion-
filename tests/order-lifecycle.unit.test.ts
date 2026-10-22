import { describe, it, expect, vi } from "vitest";
import { transitions } from "../src/lib/catalog";
import {
  canCustomerCancel,
  changeOrderInTransaction,
  validateOrderTransition,
} from "../src/lib/order-lifecycle";
describe("Order state business invariants", () => {
  it("validates every edge and rejects all other pairs", () => {
    for (const from of Object.keys(transitions))
      for (const to of Object.keys(transitions)) {
        if (transitions[from].includes(to))
          expect(() =>
            validateOrderTransition(from, to, "UNPAID"),
          ).not.toThrow();
        else
          expect(() => validateOrderTransition(from, to, "UNPAID")).toThrow();
      }
  });
  it("paid orders cannot cancel even before handoff", () => {
    for (const status of ["PENDING", "CONFIRMED", "PROCESSING", "RETURNED"])
      expect(() =>
        validateOrderTransition(status, "CANCELLED", "PAID"),
      ).toThrow();
  });
  it("customer cancellation only before preparation and unpaid", () => {
    for (const status of Object.keys(transitions)) {
      expect(canCustomerCancel(status, "UNPAID")).toBe(
        ["PENDING", "CONFIRMED"].includes(status),
      );
      expect(canCustomerCancel(status, "PAID")).toBe(false);
    }
  });
  it("treats cancellation retries as no-ops before checking carrier state", async () => {
    const shipmentLookup = vi.fn().mockResolvedValue({
      provider: "GHN_STAGING",
      status: "CANCELED",
      providerSyncStatus: "REGISTERED",
    });
    const tx = {
      order: {
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: "order-1",
          userId: "customer-1",
          status: "CANCELLED",
        }),
      },
      user: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            id: "customer-1",
            role: "CUSTOMER",
            active: true,
          }),
      },
      shipment: { findUnique: shipmentLookup },
    } as unknown as Parameters<typeof changeOrderInTransaction>[0];

    await expect(
      changeOrderInTransaction(
        tx,
        { id: "order-1", status: "CANCELLED" },
        { id: "customer-1", label: "Customer", role: "CUSTOMER" },
      ),
    ).resolves.toEqual({ id: "order-1", unchanged: true });
    expect(shipmentLookup).not.toHaveBeenCalled();
  });
});
