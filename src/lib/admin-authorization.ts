import { db } from "./db";
import { can, Permission, AuthorizationError } from "./rbac";
import { assertRolePermission } from "./rbac";
export async function authorizeAdminAction(
  role: string,
  action: string,
  b: Record<string, unknown>,
) {
  const check = (p: Permission) => assertRolePermission(role, p);
  if (action.startsWith("admin/reviews/")) {
    check("inquiries.manage");
    return;
  }
  if (["admin/order/pack", "admin/order/assign"].includes(action)) {
    check("orders.manage");
    return;
  }
  if (action.startsWith("admin/stocktakes/")) {
    check("inventory.adjust");
    return;
  }
  if (action.startsWith("admin/accounts/")) {
    check("accounts.manage");
    return;
  }
  if (action === "admin/upload") {
    if (!can(role, "products.update") && !can(role, "content.manage"))
      throw new AuthorizationError("media.upload");
    return;
  }
  if (action.startsWith("admin/staff/")) {
    const op = action.slice(12);
    const map: Record<string, Permission> = {
      create: "staff.create",
      update: "staff.update",
      status: "staff.disable",
      role: "roles.assign",
    };
    if (!map[op]) throw new AuthorizationError("unknown.staff.action");
    check(map[op]);
    return;
  }
  if (action.startsWith("admin/ghn/")) return; // Always retired with 410; never reaches carrier transport.
  if (action.startsWith("admin/returns/")) {
    const op = action.slice(14);
    if (op === "status")
      check(b.status === "RECEIVED" ? "returns.inspect" : "returns.review");
    else if (op === "inspect") {
      check("returns.inspect");
      if (b.condition === "SELLABLE") check("inventory.adjust");
    } else if (op === "exchange") check("returns.exchange");
    else if (op === "exchange-status") {
      check("returns.exchange");
      check("shipping.update");
      if (
        ["DELIVERY_FAILED", "RETURNING", "RETURNED"].includes(String(b.status))
      )
        check("shipping.failures.manage");
    } else if (op === "refund") check("refunds.approve");
    else if (op === "refund-status")
      check(
        b.status === "SIMULATED_COMPLETED"
          ? "refunds.execute"
          : "refunds.approve",
      );
    else throw new AuthorizationError("unknown.returns.action");
    return;
  }
  if (action.startsWith("admin/shipping/")) {
    const op = action.slice(15),
      map: Record<string, Permission> = {
        create: "shipping.create",
        status: "shipping.update",
        collection: "cod.collection.confirm",
        remittance: "cod.remittance.record",
        reconcile: "cod.reconcile",
      };
    if (!map[op]) throw new AuthorizationError("unknown.shipping.action");
    check(map[op]);
    if (
      op === "status" &&
      ["DELIVERY_FAILED", "RETURNING", "RETURNED"].includes(String(b.status))
    )
      check("shipping.failures.manage");
    if (op === "status" && b.status === "CANCELED") check("orders.cancel");
    return;
  }
  const target = action.slice(6),
    map: Record<string, Permission> = {
      media: "products.update",
      "media-delete": "products.update",
      publication: "products.publish",
      color: "products.update",
      outfit: "products.update",
      "size-chart": "products.update",
      variant: "products.update",
      stock: "inventory.adjust",
      "order-items-cancel": "orders.cancel",
      "inventory-movement": "inventory.adjust",
      category: "products.update",
      collection: "products.update",
      coupon: "promotions.manage",
      banner: "content.manage",
      settings: "content.manage",
      inquiry: "inquiries.manage",
      customer: "customers.manage",
    };
  if (target === "order") {
    if (b.paid) check("cod.collection.confirm");
    if (b.status && !b.paid)
      check(b.status === "CANCELLED" ? "orders.cancel" : "orders.manage");
    if (!b.status && !b.paid) check("orders.manage");
    return;
  }
  if (target === "product") {
    check(b.id ? "products.update" : "products.create");
    if (b.active === false) check("products.archive");
    return;
  }
  if (!map[target]) throw new AuthorizationError("unknown.admin.action");
  check(map[target]);
  if (target === "variant") {
    const old = b.id
      ? await db.productVariant.findUnique({
          where: { id: String(b.id) },
          select: { stock: true, stockOrigin: true },
        })
      : null;
    if (
      Number(b.stock) !== (old?.stock ?? 0) ||
      (b.stockOrigin !== undefined &&
        b.stockOrigin !== (old?.stockOrigin ?? "UNVERIFIED"))
    )
      check("inventory.adjust");
  }
}
