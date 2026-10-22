import { can, isStaff } from "./rbac";
export const accountTypes = ["ADMIN", "SELLER", "BUYER"] as const;
export type AccountType = (typeof accountTypes)[number];
export const accountTypeLabels: Record<AccountType, string> = {
  ADMIN: "Quản trị viên",
  SELLER: "Nhân viên bán hàng",
  BUYER: "Khách hàng",
};
/** Account labels map to grants; existing role records are never rewritten. */
export const accountRole: Record<AccountType, string> = {
  ADMIN: "SUPER_ADMIN",
  SELLER: "SELLER",
  BUYER: "CUSTOMER",
};
export function accountTypeForRole(role: string): AccountType {
  return ["SUPER_ADMIN", "ADMIN"].includes(role)
    ? "ADMIN"
    : isStaff(role)
      ? "SELLER"
      : "BUYER";
}
export function accountLoginDestination(
  role: string,
  _requested?: unknown,
): string {
  if (role === "SELLER") return can(role, "orders.read") ? "/admin/don-hang" : "/";
  return isStaff(role) ? "/admin" : "/";
}
