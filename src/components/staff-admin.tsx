import { LocalizedContent } from "@/components/localization";
import { PasswordField } from "./password-field";
import { db } from "@/lib/db";
import { can, assignableRoles, isStaff, rolePermissions } from "@/lib/rbac";
import { accountTypes, accountTypeLabels, accountTypeForRole } from "@/lib/account-types";
import { scalar, Params } from "@/lib/queries";
import { StaffForm } from "./staff-forms";
const date = (d: Date | null) =>
  d
    ? d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
    : "Chưa đăng nhập";
export async function StaffAdmin({
  user,
  query,
}: {
  user: { id: string; role: string };
  query: Params;
}) {
  const q = scalar(query.q),
    role = scalar(query.role),
    status = scalar(query.status);
  const staff = await db.user.findMany({
    where: {
      role: {
        in: role
          ? isStaff(role)
            ? [role]
            : []
          : Object.keys(rolePermissions).filter(isStaff),
      },
      ...(status ? { active: status === "active" } : {}),
      ...(q
        ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      lastLoginAt: true,
      permissionVersion: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const history = await db.auditLog.findMany({
    where: { resourceType: "USER", targetId: { in: staff.map((u) => u.id) } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      action: true,
      targetId: true,
      actorId: true,
      createdAt: true,
      result: true,
      reason: true,
    },
  });
  return (
    <LocalizedContent>
      {
        <>
          <h2>Nhân viên & quyền truy cập</h2>
          <p>
            Chỉ ADMIN được tạo, đổi vai trò hoặc khóa nhân viên. Thay đổi
            quyền/trạng thái thu hồi toàn bộ phiên của tài khoản; không đổi mật
            khẩu hiện hữu.
          </p>
          <form className="filter-row">
            <label>
              Tìm nhân viên
              <input name="q" defaultValue={q} />
            </label>
            <label>
              Vai trò
              <select name="role" defaultValue={role}>
                <option value="">Tất cả</option>
                {Object.keys(rolePermissions)
                  .filter(isStaff)
                  .map((r) => (
                    <option key={r} value={r}>{r} · {accountTypeLabels[accountTypeForRole(r)]}</option>
                  ))}
              </select>
            </label>
            <label>
              Trạng thái tài khoản
              <select name="status" defaultValue={status}>
                <option value="">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="disabled">Đã khóa</option>
              </select>
            </label>
            <button className="button outline small-button">
              Lọc nhân viên
            </button>
          </form>
          {staff.map((u) => (
            <details key={u.id}>
              <summary>
                <span data-localize="off">
                  {u.name} · {u.email}
                </span>{" "}
                · {u.role} · {accountTypeLabels[accountTypeForRole(u.role)]} · {u.active ? "Hoạt động" : "Đã khóa"}
              </summary>
              <p>
                Tạo: {date(u.createdAt)} · Đăng nhập gần nhất:{" "}
                {date(u.lastLoginAt)} · Phiên bản quyền: {u.permissionVersion}
              </p>
              <p>
                Quyền: {rolePermissions[u.role]?.join(", ") || "Không có quyền"}
              </p>
              {can(user.role, "staff.update") && (
                <StaffForm
                  operation="update"
                  id={u.id}
                  label="Cập nhật nhân viên"
                >
                  <label>
                    Tên nhân viên
                    <input
                      name="name"
                      defaultValue={u.name}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Email nhân viên
                    <input
                      name="email"
                      type="email"
                      defaultValue={u.email}
                      required
                    />
                  </label>
                </StaffForm>
              )}
              {u.id !== user.id && can(user.role, "roles.assign") && (
                <StaffForm operation="role" id={u.id} label="Đổi vai trò">
                  <label>
                    Vai trò mới
                    <select
                      name="role"
                      defaultValue={u.role}
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>{r} · {accountTypeLabels[accountTypeForRole(r)]}</option>
                      ))}
                    </select>
                  </label>
                </StaffForm>
              )}
              {u.id !== user.id && can(user.role, "staff.disable") && (
                <StaffForm
                  operation="status"
                  id={u.id}
                  label={u.active ? "Khóa nhân viên" : "Kích hoạt nhân viên"}
                >
                  <input
                    name="active"
                    type="hidden"
                    value={String(!u.active)}
                  />
                </StaffForm>
              )}
            </details>
          ))}
          {!staff.length && <p>Không có nhân viên phù hợp.</p>}
          {can(user.role, "staff.create") && (
            <StaffForm operation="create" label="Tạo nhân viên local">
              <h3>Tạo nhân viên</h3>
              <label>
                Tên nhân viên
                <input name="name" minLength={2} required />
              </label>
              <label>
                Email nhân viên
                <input name="email" type="email" required />
              </label>
              <PasswordField
                label="Mật khẩu khởi tạo (ít nhất 12 ký tự)"
                name="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
              />
              <label>
                Vai trò được cấp
                <select name="role" defaultValue="SELLER">
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>{r} · {accountTypeLabels[accountTypeForRole(r)]}</option>
                  ))}
                </select>
              </label>
            </StaffForm>
          )}
          <h3>Lịch sử quản lý nhân viên</h3>
          {history.map((h) => (
            <p key={h.id}>
              {date(h.createdAt)} · {h.action} · {h.result}
              <br />
              Người thao tác {h.actorId} · Tài khoản {h.targetId}
              <br />
              {h.reason}
            </p>
          ))}
        </>
      }
    </LocalizedContent>
  );
}
export function PermissionOverview({ role }: { role: string }) {
  return (
    <LocalizedContent>
      {
        <>
          <h2>Vai trò hiện tại: {role}</h2>
          <p>
            Quyền được kiểm tra ở server trên mỗi yêu cầu. Quyền không được liệt
            kê mặc định bị từ chối. Chỉ thay vai trò qua quản trị viên được
            phép; không có tự cấp quyền.
          </p>
          <ul>
            {rolePermissions[role]?.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <details>
            <summary>Ma trận vai trò chuẩn</summary>
            {accountTypes.map((r) => (
              <section key={r}>
                <h3>{r} · {accountTypeLabels[r]}</h3>
                <p>{rolePermissions[r].join(", ") || "Mua sắm, theo dõi đơn hàng và quản lý tài khoản cá nhân."}</p>
              </section>
            ))}
          </details>
        </>
      }
    </LocalizedContent>
  );
}
export async function AuditAdmin({ query }: { query: Params }) {
  const q = scalar(query.q),
    result = scalar(query.result);
  const rows = await db.auditLog.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { action: { contains: q } },
              { actorId: { contains: q } },
              { targetId: { contains: q } },
            ],
          }
        : {}),
      ...(result ? { result } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <LocalizedContent>
      {
        <>
          <h2>Nhật ký vận hành — chỉ đọc</h2>
          <form className="filter-row">
            <label>
              Tìm hành động / người / đối tượng
              <input name="q" defaultValue={q} />
            </label>
            <label>
              Kết quả
              <select name="result" defaultValue={result}>
                <option value="">Tất cả</option>
                {["SUCCESS", "DENIED", "REJECTED"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <button className="button outline small-button">Lọc nhật ký</button>
          </form>
          <p>
            100 bản ghi gần nhất. Không có chức năng chỉnh sửa hoặc xóa audit.
          </p>
          {rows.map((r) => (
            <details key={r.id}>
              <summary>
                {date(r.createdAt)} · {r.action} · {r.result}
              </summary>
              <p>
                {r.resourceType} · {r.targetId} · Người thao tác {r.actorId}
              </p>
              <p>{r.reason}</p>
              <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {r.detail}
              </pre>
            </details>
          ))}
        </>
      }
    </LocalizedContent>
  );
}
