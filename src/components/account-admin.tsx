import { LocalizedContent } from "@/components/localization";
import { db } from "@/lib/db";
import {
  accountTypes,
  accountTypeLabels,
  accountTypeForRole,
} from "@/lib/account-types";
import { rolePermissions, can } from "@/lib/rbac";
import { Params, scalar } from "@/lib/queries";
import { StaffForm } from "./staff-forms";
import { PasswordField } from "./password-field";
import { AdminPagination, adminPage } from "./admin-pagination";
export async function AccountAdmin({
  user,
  query,
}: {
  user: { id: string; role: string };
  query: Params;
}) {
  if (!can(user.role, "accounts.manage"))
    throw Error("Không có quyền quản lý tài khoản.");
  const q = scalar(query.q),
    type = scalar(query.type),
    state = scalar(query.state),
    page = adminPage(query);
  const roles = Object.keys(rolePermissions).filter(
    (role) => accountTypeForRole(role) === type,
  );
  const where = {
    ...(type ? { role: { in: roles } } : {}),
    ...(state ? { active: state === "active" } : {}),
    ...(q
      ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
      : {}),
  };
  const [count, accounts] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 24,
      skip: (page - 1) * 24,
    }),
  ]);
  return (
    <LocalizedContent>
      {
        <>
          <h2>Quản lý tài khoản</h2>
          <p>
            ADMIN dùng quyền SUPER_ADMIN; SELLER vận hành bán hàng; BUYER dùng
            quyền CUSTOMER. Các vai trò nhân viên chuyên biệt hiện hữu giữ
            nguyên quyền cho đến khi quản trị viên chủ động đổi loại.
          </p>
          <form className="filter-row">
            <label>
              Tìm tài khoản
              <input name="q" defaultValue={q} />
            </label>
            <label>
              Loại tài khoản
              <select name="type" defaultValue={type}>
                <option value="">Tất cả</option>
                {accountTypes.map((t) => (
                  <option key={t} value={t}>
                    {t} · {accountTypeLabels[t]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Trạng thái tài khoản
              <select name="state" defaultValue={state}>
                <option value="">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="disabled">Đã khóa</option>
              </select>
            </label>
            <button className="button outline small-button">
              Lọc tài khoản
            </button>
          </form>
          <p>{count} tài khoản</p>
          {accounts.map((a) => (
            <details key={a.id} className="account-admin-record">
              <summary>
                <span data-localize="off">
                  {a.name} · {a.email}
                </span>{" "}
                · {accountTypeForRole(a.role)} ·{" "}
                {a.active ? "Hoạt động" : "Đã khóa"}
              </summary>
              <p>
                Vai trò nghiệp vụ: {a.role}.{" "}
                {a.lastLoginAt
                  ? `Đăng nhập gần nhất: ${a.lastLoginAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`
                  : "Chưa đăng nhập"}
              </p>
              <StaffForm
                resource="accounts"
                operation="update"
                id={a.id}
                label="Lưu thông tin tài khoản"
              >
                <label>
                  Tên tài khoản
                  <input
                    name="name"
                    defaultValue={a.name}
                    required
                    minLength={2}
                  />
                </label>
                <label>
                  Email tài khoản
                  <input
                    name="email"
                    type="email"
                    defaultValue={a.email}
                    required
                  />
                </label>
              </StaffForm>
              {a.id !== user.id && (
                <>
                  <StaffForm
                    resource="accounts"
                    operation="type"
                    id={a.id}
                    label="Đổi loại tài khoản"
                  >
                    <label>
                      Loại tài khoản mới
                      <select
                        name="accountType"
                        defaultValue={accountTypeForRole(a.role)}
                      >
                        {accountTypes.map((t) => (
                          <option key={t} value={t}>
                            {t} · {accountTypeLabels[t]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </StaffForm>
                  <StaffForm
                    resource="accounts"
                    operation="status"
                    id={a.id}
                    label={a.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                  >
                    <input
                      name="active"
                      type="hidden"
                      value={String(!a.active)}
                    />
                  </StaffForm>
                </>
              )}
            </details>
          ))}
          {!count && <p>Không có tài khoản phù hợp.</p>}
          <AdminPagination page={page} count={count} query={query} />
          <StaffForm
            resource="accounts"
            operation="create"
            label="Tạo tài khoản local"
          >
            <h3>Tạo tài khoản local</h3>
            <label>
              Tên tài khoản
              <input name="name" required minLength={2} />
            </label>
            <label>
              Email tài khoản
              <input name="email" type="email" required />
            </label>
            <PasswordField
              name="password"
              label="Mật khẩu khởi tạo"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <label>
              Loại tài khoản được cấp
              <select name="accountType" defaultValue="BUYER">
                {accountTypes.map((t) => (
                  <option key={t} value={t}>
                    {t} · {accountTypeLabels[t]}
                  </option>
                ))}
              </select>
            </label>
            <p>
              Đổi loại hoặc khóa tài khoản sẽ thu hồi phiên đăng nhập. Không thể
              tự khóa hay tự đổi quyền; SUPER_ADMIN hoạt động cuối cùng được bảo
              vệ.
            </p>
          </StaffForm>
        </>
      }
    </LocalizedContent>
  );
}
