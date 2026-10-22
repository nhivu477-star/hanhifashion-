import { describe, it, expect } from "vitest";
import {
  accountRole,
  accountTypeForRole,
  accountLoginDestination,
} from "../src/lib/account-types";
import { can, isStaff } from "../src/lib/rbac";
describe("Three account labels over existing RBAC", () => {
  it("maps new accounts without promoting legacy ADMIN", () => {
    expect(accountRole).toEqual({
      ADMIN: "SUPER_ADMIN",
      SELLER: "SELLER",
      BUYER: "CUSTOMER",
    });
    expect(accountTypeForRole("PRODUCT_STAFF")).toBe("SELLER");
    expect(can("ADMIN", "accounts.manage")).toBe(false);
    expect(can("SUPER_ADMIN", "accounts.manage")).toBe(true);
  });
  it("seller gets catalog, stock, order and simulated shipping but no identity or financial grants", () => {
    expect(isStaff("SELLER")).toBe(true);
    for (const p of [
      "products.create",
      "products.update",
      "inventory.adjust",
      "orders.manage",
      "shipping.update",
    ] as const)
      expect(can("SELLER", p)).toBe(true);
    for (const p of [
      "accounts.manage",
      "staff.create",
      "roles.assign",
      "cod.read",
      "cod.collection.confirm",
      "refunds.approve",
      "refunds.execute",
      "analytics.finance.read",
      "analytics.profit.read",
      "analytics.costs.manage",
    ] as const)
      expect(can("SELLER", p)).toBe(false);
  });
  it("uses appropriate default and rejects forbidden return destinations", () => {
    expect(accountLoginDestination("SUPER_ADMIN")).toBe("/admin");
    expect(accountLoginDestination("SELLER")).toBe("/seller");
    expect(accountLoginDestination("CUSTOMER")).toBe("/");
    expect(accountLoginDestination("SELLER", "/admin/tai-khoan")).toBe(
      "/seller",
    );
    expect(accountLoginDestination("SELLER", "/admin/phan-tich/finance")).toBe(
      "/seller",
    );
    expect(accountLoginDestination("CUSTOMER", "/admin")).toBe("/");
    expect(accountLoginDestination("SELLER", "https://example.com")).toBe(
      "/seller",
    );
    expect(accountLoginDestination("CUSTOMER", "/san-pham/abc?mau=white")).toBe(
      "/san-pham/abc?mau=white",
    );
  });
});
