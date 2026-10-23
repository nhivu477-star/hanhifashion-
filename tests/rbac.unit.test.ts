import { describe, it, expect } from "vitest";
import {
  accountRoles,
  permissions,
  can,
  isStaff,
  assignableRoles,
  rolePermissions,
  assertRolePermission,
} from "../src/lib/rbac";
import { safeAuditValue } from "../src/lib/authorization";
import { authorizeAdminAction } from "../src/lib/admin-authorization";
import { analyticsRows } from "../src/lib/analytics-report";
import { reportFilter } from "../src/lib/analytics-rules";

describe("Canonical account permission boundaries", () => {
  it("exposes exactly three tiers and ADMIN has every permission", () => {
    expect(Object.keys(rolePermissions).sort()).toEqual([...accountRoles].sort());
    expect(accountRoles).toEqual(["CUSTOMER", "SELLER", "ADMIN"]);
    expect(assignableRoles).toEqual(["SELLER", "ADMIN"]);
    expect(permissions.every((p) => can("ADMIN", p))).toBe(true);
  });
  it("customer, unknown, retired and prototype names default deny", () => {
    for (const role of ["CUSTOMER", "STAFF", "SUPER_ADMIN", "PRODUCT_STAFF", "untrusted", "__proto__", "constructor"])
      expect(permissions.some((permission) => can(role, permission))).toBe(false);
    expect(isStaff("CUSTOMER")).toBe(false);
    expect(isStaff("SUPER_ADMIN")).toBe(false);
    expect(isStaff("__proto__")).toBe(false);
  });
  it("seller operates sales, stock, shipping and support without identity or financial powers", () => {
    expect(isStaff("SELLER")).toBe(true);
    for (const permission of ["products.create", "inventory.adjust", "orders.manage", "shipping.update", "returns.read", "inquiries.manage"] as const)
      expect(can("SELLER", permission)).toBe(true);
    for (const permission of ["returns.review", "returns.inspect", "returns.exchange", "accounts.manage", "staff.read", "staff.create", "staff.update", "staff.disable", "roles.assign", "customers.manage", "customers.read", "audit.read", "cod.read", "cod.collection.confirm", "cod.remittance.record", "cod.reconcile", "refunds.read", "refunds.approve", "refunds.execute", "analytics.profit.read", "analytics.finance.read", "analytics.costs.manage"] as const)
      expect(can("SELLER", permission)).toBe(false);
  });
  it("all grants refer to known permissions", () => {
    for (const role of accountRoles)
      expect(rolePermissions[role].every((p) => permissions.includes(p))).toBe(true);
    expect(() => assertRolePermission("SELLER", "roles.assign")).toThrow();
  });
  it("guards management API actions independently of supplied payload roles", async () => {
    for (const action of ["admin/accounts/create", "admin/staff/role", "admin/customer", "admin/returns/status", "admin/returns/inspect", "admin/returns/exchange", "admin/returns/exchange-status", "admin/returns/refund", "admin/shipping/collection", "admin/settings"])
      await expect(authorizeAdminAction("SELLER", action, { role: "ADMIN" })).rejects.toThrow();
    for (const action of ["admin/product", "admin/stock", "admin/order/pack", "admin/shipping/create", "admin/inquiry"])
      await expect(authorizeAdminAction("SELLER", action, {})).resolves.toBeUndefined();
    await expect(authorizeAdminAction("CUSTOMER", "admin/product", {})).rejects.toThrow();
    await expect(authorizeAdminAction("ADMIN", "admin/accounts/create", {})).resolves.toBeUndefined();
    await expect(authorizeAdminAction("ADMIN", "admin/unknown", {})).rejects.toThrow();
  });
  it("denies unauthorized direct analytics reads before querying data", async () => {
    await expect(analyticsRows(reportFilter({ section: "finance" }), "SELLER")).rejects.toThrow();
    await expect(analyticsRows(reportFilter({ section: "inventory" }), "CUSTOMER")).rejects.toThrow();
  });
  it("audit sanitizer drops credentials and unrelated identity recursively", () => {
    const s = JSON.stringify(safeAuditValue({
      password: "private-password", sessionToken: "private-token",
      nested: { email: "private-email", role: "SELLER", passwordHash: "private-hash" },
    }));
    expect(s).not.toContain("private");
    expect(s).toContain("SELLER");
  });
});
