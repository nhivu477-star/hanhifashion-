import { beforeEach, describe, expect, it, vi } from "vitest";

const { tx, outsideUserLookup, hashPassword } = vi.hoisted(() => ({
  tx: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    order: { findUniqueOrThrow: vi.fn() },
    returnRequest: { findUniqueOrThrow: vi.fn() },
    shipment: { findUniqueOrThrow: vi.fn() },
  },
  outsideUserLookup: vi.fn(),
  hashPassword: vi.fn(),
}));
vi.mock("../src/lib/db", () => ({ db: { user: { findUnique: outsideUserLookup } } }));
vi.mock("../src/lib/order-lifecycle", () => ({
  orderTransaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
}));
vi.mock("bcryptjs", () => ({ hash: hashPassword }));

import { AuthorizationError } from "../src/lib/rbac";
import { requireCurrentAccount } from "../src/lib/authorization";
import {
  allocateExchange, changeRefund, changeReturn, exchangeStatus,
  inspectReturn, prepareRefund, createReturn,
} from "../src/lib/returns";
import { createShipment, recordCOD, reconcileCOD } from "../src/lib/shipping";
import { createStaff } from "../src/lib/staff";
import { saveCustomerAddress } from "../src/lib/customer-addresses";
import { createReview, replyFeedback } from "../src/lib/customer-feedback";
import { sendSupportMessage } from "../src/lib/support-chat";

const actor = { id: "operator", label: "Operator", role: "ADMIN", permissionVersion: 1 };
const returnActions = [
  () => changeReturn("return", "APPROVED", "Confirmed defect", actor),
  () => inspectReturn("return", "item", "SELLABLE", "Inspected", "Evidence", actor),
  () => allocateExchange("return", [{ itemId: "item", variantId: "sku" }], "Equal-price replacement", actor),
  () => exchangeStatus("return", "exchange", "DELIVERED", "Delivery confirmed", actor),
  () => prepareRefund("return", false, "Confirmed refund", actor),
  () => changeRefund("return", "SIMULATED_COMPLETED", "Local simulation", actor),
];
const shippingActions = [
  () => createShipment({
    orderId: "order", provider: "LOCAL_MANUAL", shippingFee: 30000,
    parcelDescription: "Packed goods", weightGrams: 500, parcelCount: 1,
  }, actor),
  () => recordCOD("collection", {
    id: "shipment", eventKey: "event", provider: "LOCAL_MANUAL",
    reference: "receipt", amount: 100000, evidence: "Local receipt",
    occurredAt: new Date().toISOString(),
  }, actor),
  () => reconcileCOD({ id: "shipment", eventKey: "event", action: "RECONCILE", note: "Matched receipts" }, actor),
];

beforeEach(() => {
  vi.clearAllMocks();
  outsideUserLookup.mockResolvedValue({ id: actor.id, active: true, role: "ADMIN", permissionVersion: 1 });
});

describe("Workflow authorization at the write boundary", () => {
  it("denies a disabled account using current transactional state, even if a prior lookup allowed ADMIN", async () => {
    tx.user.findUnique.mockResolvedValue({ id: actor.id, active: false, role: "ADMIN", permissionVersion: 1 });
    for (const action of [...returnActions, ...shippingActions])
      await expect(action()).rejects.toBeInstanceOf(AuthorizationError);
    expect(outsideUserLookup).not.toHaveBeenCalled();
    expect(tx.order.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.returnRequest.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.shipment.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("denies SELLER return decisions despite an ADMIN role supplied by the caller", async () => {
    tx.user.findUnique.mockResolvedValue({ id: actor.id, active: true, role: "SELLER", permissionVersion: 1 });
    for (const action of returnActions)
      await expect(action()).rejects.toBeInstanceOf(AuthorizationError);
    expect(outsideUserLookup).not.toHaveBeenCalled();
    expect(tx.returnRequest.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it("denies revoked authenticated versions across shipping and return mutations even while ADMIN remains active", async () => {
    tx.user.findUnique.mockResolvedValue({ id: actor.id, active: true, role: "ADMIN", permissionVersion: 2 });
    for (const action of [...returnActions, ...shippingActions])
      await expect(action()).rejects.toBeInstanceOf(AuthorizationError);
    expect(tx.order.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.returnRequest.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.shipment.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it("denies revoked customer snapshots across owned address, review, support and return writes", async () => {
    const customer = { ...actor, role: "CUSTOMER" };
    const eventKey = "10000000-0000-4000-8000-000000000001";
    outsideUserLookup.mockResolvedValue({ ...customer, active: true });
    tx.user.findUnique.mockResolvedValue({ ...customer, active: true, permissionVersion: 2 });
    const actions = [
      () => saveCustomerAddress({}, customer),
      () => createReview({ orderId: "order", productId: "product", rating: 5, comment: "Verified purchase", eventKey }, customer),
      () => replyFeedback("inquiry", { id: "thread", content: "Customer reply", eventKey }, customer),
      () => sendSupportMessage({ content: "Customer message", eventKey }, customer),
      () => createReturn({
        orderId: "order", eventKey, resolution: "REFUND", reason: "Confirmed defect request",
        items: [{ orderItemId: "item", quantity: 1 }],
      }, customer),
    ];
    for (const action of actions)
      await expect(action()).rejects.toBeInstanceOf(AuthorizationError);
    expect(tx.order.findUniqueOrThrow).not.toHaveBeenCalled();
  });
  it("cannot create staff if authentication is revoked while the password is hashing", async () => {
    let completeHash!: (value: string) => void;
    hashPassword.mockImplementationOnce(() => new Promise<string>((resolve) => { completeHash = resolve; }));
    const pending = createStaff({
      name: "New administrator", email: "staff@example.test",
      password: "Long-Strong-Test-Password", role: "ADMIN", reason: "Authorized creation request",
    }, actor);
    tx.user.findUnique.mockResolvedValue({ id: actor.id, active: true, role: "ADMIN", permissionVersion: 2 });
    completeHash("hashed-password");
    await expect(pending).rejects.toBeInstanceOf(AuthorizationError);
    expect(tx.user.create).not.toHaveBeenCalled();
  });
  it("rejects a revoked account snapshot at personal cart/checkout write boundaries", async () => {
    const client = tx as unknown as Parameters<typeof requireCurrentAccount>[0];
    const snapshot = { id: actor.id, permissionVersion: 4 };
    for (const user of [
      { active: false, role: "CUSTOMER", permissionVersion: 4 },
      { active: true, role: "CUSTOMER", permissionVersion: 5 },
      { active: true, role: "UNKNOWN", permissionVersion: 4 },
    ]) {
      tx.user.findUnique.mockResolvedValue({ id: actor.id, ...user });
      await expect(requireCurrentAccount(client, snapshot)).rejects.toBeInstanceOf(AuthorizationError);
    }
    const valid = { ...snapshot, active: true, role: "CUSTOMER" };
    tx.user.findUnique.mockResolvedValue(valid);
    await expect(requireCurrentAccount(client, snapshot)).resolves.toEqual(valid);
    await expect(requireCurrentAccount(client, { id: actor.id } as typeof snapshot))
      .rejects.toBeInstanceOf(AuthorizationError);
  });
});
