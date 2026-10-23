/** Canonical account tiers; unknown roles never receive staff permissions. */
export const permissions = [
  "accounts.manage",
  "staff.read",
  "staff.create",
  "staff.update",
  "staff.disable",
  "roles.assign",
  "audit.read",
  "products.read",
  "products.create",
  "products.update",
  "products.publish",
  "products.archive",
  "inventory.read",
  "inventory.adjust",
  "inventory.movements.read",
  "orders.read",
  "orders.manage",
  "orders.cancel",
  "shipping.read",
  "shipping.create",
  "shipping.update",
  "shipping.failures.manage",
  "cod.read",
  "cod.collection.confirm",
  "cod.remittance.record",
  "cod.reconcile",
  "refunds.read",
  "refunds.approve",
  "refunds.execute",
  "returns.read",
  "returns.review",
  "returns.inspect",
  "returns.exchange",
  "promotions.read",
  "promotions.manage",
  "content.read",
  "content.manage",
  "analytics.read",
  "analytics.sales.read",
  "analytics.products.read",
  "analytics.customers.read",
  "analytics.inventory.read",
  "analytics.profit.read",
  "analytics.marketing.read",
  "analytics.finance.read",
  "analytics.costs.manage",
  "analytics.export",
  "customers.read",
  "customers.manage",
  "inquiries.read",
  "inquiries.manage",
] as const;
export type Permission = (typeof permissions)[number];
const product: Permission[] = [
  "products.read",
  "products.create",
  "products.update",
  "products.publish",
  "products.archive",
];
const inventory: Permission[] = [
  "inventory.read",
  "inventory.adjust",
  "inventory.movements.read",
];
const orders: Permission[] = ["orders.read", "orders.manage", "orders.cancel"];
const shipping: Permission[] = [
  "shipping.read",
  "shipping.create",
  "shipping.update",
  "shipping.failures.manage",
];
export const accountRoles = ["CUSTOMER", "SELLER", "ADMIN"] as const;
export type AccountRole = (typeof accountRoles)[number];
export const isAccountRole = (role: string): role is AccountRole =>
  accountRoles.some((candidate) => candidate === role);
export const rolePermissions: Record<string, readonly Permission[]> = {
  ADMIN: permissions,
  SELLER: [
    "inquiries.read",
    "inquiries.manage",
    ...product,
    ...inventory,
    ...orders,
    ...shipping,
    "returns.read",
    "analytics.read",
    "analytics.products.read",
    "analytics.inventory.read",
  ],
  CUSTOMER: [],
};
export const assignableRoles = ["SELLER", "ADMIN"] as const;
export const isStaff = (role: string) =>
  role === "SELLER" || role === "ADMIN";
export const can = (role: string, permission: Permission) =>
  Object.hasOwn(rolePermissions, role) &&
  rolePermissions[role].includes(permission);
export class AuthorizationError extends Error {
  constructor(readonly permission: string) {
    super(`Không có quyền: ${permission}.`);
    this.name = "AuthorizationError";
  }
}
export function assertRolePermission(role: string, p: Permission) {
  if (!can(role, p)) throw new AuthorizationError(p);
}
export const adminPagePermission: Record<string, Permission> = {
  "tai-khoan": "accounts.manage",
  "": "analytics.read",
  "phan-tich": "analytics.read",
  "san-pham": "products.read",
  "thu-vien-anh": "products.read",
  "danh-muc": "products.read",
  "bo-suu-tap": "products.read",
  "kho-hang": "inventory.read",
  "don-hang": "orders.read",
  "van-chuyen": "shipping.read",
  "doi-tra": "returns.read",
  "khach-hang": "customers.read",
  "ma-giam-gia": "promotions.read",
  banner: "content.read",
  "cai-dat": "content.read",
  "lien-he": "inquiries.read",
  "nhan-vien": "staff.read",
  "nhat-ky": "audit.read",
  "phan-quyen": "staff.read",
};
