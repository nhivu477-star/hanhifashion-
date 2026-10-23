import { describe, it, expect, vi } from "vitest";
import { transitions } from "../src/lib/catalog";
import {
  canCustomerCancel,
  changeOrderInTransaction,
  validateOrderTransition,
  returnedStockQuantities,
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
  it("requires complete return-to-sender inspection and restocks only sellable quantities", () => {
    const items = [{ id: "a", quantity: 3 }, { id: "b", quantity: 1 }];
    const inspection = [
      { orderItemId: "b", sellableQuantity: 0, damagedQuantity: 1 },
      { orderItemId: "a", sellableQuantity: 2, damagedQuantity: 1 },
    ];
    expect(Object.fromEntries(returnedStockQuantities(items, inspection))).toEqual({ a: 2, b: 0 });
    const invalid = [
      undefined,
      [],
      inspection.slice(0, 1),
      [inspection[0], inspection[0]],
      [inspection[0], { ...inspection[1], orderItemId: "foreign" }],
      [inspection[0], { ...inspection[1], sellableQuantity: -1 }],
      [inspection[0], { ...inspection[1], sellableQuantity: 1.5 }],
      [inspection[0], { ...inspection[1], damagedQuantity: 0 }],
      [inspection[0], { ...inspection[1], damagedQuantity: Number.NaN }],
    ];
    for (const rows of invalid)
      expect(() => returnedStockQuantities(items, rows)).toThrow();
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
            permissionVersion: 1,
          }),
      },
      shipment: { findUnique: shipmentLookup },
    } as unknown as Parameters<typeof changeOrderInTransaction>[0];

    await expect(
      changeOrderInTransaction(
        tx,
        { id: "order-1", status: "CANCELLED" },
        { id: "customer-1", label: "Customer", role: "CUSTOMER", permissionVersion: 1 },
      ),
    ).resolves.toEqual({ id: "order-1", unchanged: true });
    expect(shipmentLookup).not.toHaveBeenCalled();
  });
  it("does not let an account-owned order cookie bypass revoked account authentication", async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      order: { findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "order-1", userId: "customer-1", status: "CANCELLED", accessToken: "legacy-capability",
      }) },
    } as unknown as Parameters<typeof changeOrderInTransaction>[0];
    await expect(changeOrderInTransaction(tx, { id: "order-1", status: "CANCELLED" }, {
      id: "guest", label: "Guest", role: "GUEST", accessToken: "legacy-capability",
    })).rejects.toThrow();
  });
  it("preserves real legacy guest-order capabilities without a customer account", async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
      order: { findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: "guest-order", userId: null, status: "CANCELLED", accessToken: "legacy-capability",
      }) },
    } as unknown as Parameters<typeof changeOrderInTransaction>[0];
    await expect(changeOrderInTransaction(tx, { id: "guest-order", status: "CANCELLED" }, {
      id: "guest", label: "Guest", role: "GUEST", accessToken: "legacy-capability",
    })).resolves.toEqual({ id: "guest-order", unchanged: true });
  });
});
