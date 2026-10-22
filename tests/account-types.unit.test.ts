import { describe, it, expect } from "vitest";
import {
  accountTypes,
  accountRole,
  accountTypeForRole,
  accountLoginDestination,
} from "../src/lib/account-types";
import { can, isStaff } from "../src/lib/rbac";

describe("Three canonical account tiers", () => {
  it("uses the same values for account labels and stored roles", () => {
    expect(accountTypes).toEqual(["CUSTOMER", "SELLER", "ADMIN"]);
    expect(accountRole).toEqual({ ADMIN: "ADMIN", SELLER: "SELLER", CUSTOMER: "CUSTOMER" });
    for (const role of accountTypes) expect(accountTypeForRole(role)).toBe(role);
    expect(() => accountTypeForRole("PRODUCT_STAFF")).toThrow();
    expect(() => accountTypeForRole("BUYER")).toThrow();
    expect(can("ADMIN", "accounts.manage")).toBe(true);
  });
  it("seller has operational permissions but no identity or financial grants", () => {
    expect(isStaff("SELLER")).toBe(true);
    for (const p of ["products.create", "products.update", "inventory.adjust", "orders.manage", "shipping.update", "returns.review", "inquiries.manage"] as const)
      expect(can("SELLER", p)).toBe(true);
    for (const p of ["accounts.manage", "staff.create", "roles.assign", "cod.read", "cod.collection.confirm", "refunds.approve", "refunds.execute", "analytics.finance.read", "analytics.profit.read", "analytics.costs.manage"] as const)
      expect(can("SELLER", p)).toBe(false);
  });
  it("uses role-specific defaults and rejects forbidden return destinations", () => {
    expect(accountLoginDestination("ADMIN")).toBe("/admin");
    expect(accountLoginDestination("SELLER")).toBe("/admin/don-hang");
    expect(accountLoginDestination("CUSTOMER")).toBe("/");
    for (const destination of ["/admin/tai-khoan", "/admin/phan-tich/finance", "/admin/phan-tich/profit", "/admin/phan-tich/customers", "/admin/nhan-vien", "https://example.com", "//example.com", "/api/session", "/dang-nhap", "/\\example.com"])
      expect(accountLoginDestination("SELLER", destination)).toBe("/admin/don-hang");
    expect(accountLoginDestination("CUSTOMER", "/admin")).toBe("/");
    expect(accountLoginDestination("CUSTOMER", "/admin/don-hang")).toBe("/");
  });
  it("preserves safe authorized checkout, account, order and analytics destinations", () => {
    for (const destination of ["/thanh-toan", "/tai-khoan/don-hang/order-id", "/san-pham/abc?mau=white"])
      expect(accountLoginDestination("CUSTOMER", destination)).toBe(destination);
    expect(accountLoginDestination("SELLER", "/admin/don-hang/order-id")).toBe("/admin/don-hang/order-id");
    expect(accountLoginDestination("SELLER", "/admin/phan-tich/inventory")).toBe("/admin/phan-tich/inventory");
    expect(accountLoginDestination("ADMIN", "/admin/tai-khoan?q=khach")).toBe("/admin/tai-khoan?q=khach");
    expect(accountLoginDestination("ADMIN", "/admin/phan-tich/finance")).toBe("/admin/phan-tich/finance");
  });
});
