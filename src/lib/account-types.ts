import { accountRoles, adminPagePermission, can, isAccountRole, isStaff } from "./rbac";
import { safeReturnTo } from "./safe-redirect";
import { analyticsPermission } from "./analytics-access";
export const accountTypes = accountRoles;
export type AccountType = (typeof accountTypes)[number];
export const accountTypeLabels: Record<AccountType, string> = {
  ADMIN: "Quản trị viên",
  SELLER: "Nhân viên bán hàng",
  CUSTOMER: "Khách hàng",
};
export const accountRole: Record<AccountType, AccountType> = {
  ADMIN: "ADMIN",
  SELLER: "SELLER",
  CUSTOMER: "CUSTOMER",
};
export function accountTypeForRole(role: string): AccountType {
  if (!isAccountRole(role)) throw new Error("Vai trò tài khoản không hợp lệ.");
  return role;
}
export function accountLoginDestination(
  role: string,
  requested?: unknown,
): string {
  const destination = safeReturnTo(requested);
  if (destination) {
    const pathname = new URL(destination, "http://local.invalid").pathname;
    if (pathname !== "/admin" && !pathname.startsWith("/admin/"))
      return destination;
    const permission = adminPagePermission[pathname.split("/")[2] ?? ""];
    if (permission && isStaff(role) && can(role, permission)) {
      if (pathname.startsWith("/admin/phan-tich/")) {
        const section = pathname.split("/")[3] as keyof typeof analyticsPermission;
        if (Object.hasOwn(analyticsPermission, section) && can(role, analyticsPermission[section]))
          return destination;
      } else return destination;
    }
  }
  if (role === "SELLER") return "/admin/don-hang";
  return isStaff(role) ? "/admin" : "/";
}
