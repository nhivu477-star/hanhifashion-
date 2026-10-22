import { describe, it, expect } from "vitest";
import {
  permissions,
  can,
  isStaff,
  assignableRoles,
  rolePermissions,
  assertRolePermission,
} from "../src/lib/rbac";
import { safeAuditValue } from "../src/lib/authorization";
describe("Phase 4 permission boundaries", () => {
  it("SUPER_ADMIN explicit full grants", () => {
    expect(permissions.every((p) => can("SUPER_ADMIN", p))).toBe(true);
  });
  it("unknown roles and generic STAFF default deny", () => {
    expect(isStaff("STAFF")).toBe(false);
    expect(
      permissions.some(
        (p) => can("STAFF", p) || can("untrusted", p) || can("CUSTOMER", p),
      ),
    ).toBe(false);
  });
  it("operational manager cannot assign roles or execute financial actions", () => {
    expect(can("STORE_MANAGER", "orders.manage")).toBe(true);
    expect(can("STORE_MANAGER", "roles.assign")).toBe(false);
    expect(can("STORE_MANAGER", "refunds.execute")).toBe(false);
  });
  it("inventory and finance duties are separated", () => {
    expect(can("INVENTORY_STAFF", "inventory.adjust")).toBe(true);
    expect(can("INVENTORY_STAFF", "refunds.approve")).toBe(false);
    expect(can("FINANCE_STAFF", "inventory.adjust")).toBe(false);
    expect(can("FINANCE_STAFF", "cod.reconcile")).toBe(true);
  });
  it("support reviews without refund execution, content without ledger", () => {
    expect(can("CUSTOMER_SUPPORT", "returns.review")).toBe(true);
    expect(can("CUSTOMER_SUPPORT", "refunds.execute")).toBe(false);
    expect(can("CONTENT_STAFF", "cod.read")).toBe(false);
  });
  it("legacy ADMIN keeps operations but is not silently promoted", () => {
    expect(can("ADMIN", "cod.reconcile")).toBe(true);
    expect(can("ADMIN", "roles.assign")).toBe(false);
    expect(can("ADMIN", "staff.create")).toBe(false);
  });
  it("all role grants refer to known permissions", () => {
    for (const role of assignableRoles)
      expect(rolePermissions[role].every((p) => permissions.includes(p))).toBe(
        true,
      );
    expect(() => assertRolePermission("ORDER_STAFF", "roles.assign")).toThrow();
  });
  it("audit sanitizer drops credentials and unrelated identity recursively", () => {
    const s = JSON.stringify(
      safeAuditValue({
        password: "private-password",
        sessionToken: "private-token",
        nested: {
          email: "private-email",
          role: "ORDER_STAFF",
          passwordHash: "private-hash",
        },
      }),
    );
    expect(s).not.toContain("private");
    expect(s).toContain("ORDER_STAFF");
  });
});
