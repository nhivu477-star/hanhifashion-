import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { can, assertRolePermission } from "@/lib/rbac";
import { money, statusLabels } from "@/lib/catalog";
import { returnLabels } from "@/lib/returns-rules";
import { ActionButton } from "./store";
import { AdminPagination, adminPage } from "./admin-pagination";
import { Params } from "@/lib/queries";

export async function CustomerProfile({
  id,
  role,
  query,
}: {
  id: string;
  role: string;
  query: Params;
}) {
  assertRolePermission(role, "customers.read");
  const customer = await db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      active: true,
      _count: { select: { orders: true } },
    },
  });
  if (!customer) notFound();
  const page = adminPage(query),
    take = 24,
    skip = (page - 1) * take;
  const [orders, paid, returns, inquiries] = await Promise.all([
    db.order.findMany({
      where: { userId: id },
      select: {
        id: true,
        code: true,
        total: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.payment.aggregate({
      where: { order: { userId: id }, status: "PAID" },
      _sum: { amount: true },
    }),
    can(role, "returns.read")
      ? db.returnRequest.findMany({
          where: { userId: id },
          select: { id: true, status: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
    can(role, "inquiries.read")
      ? db.inquiry.findMany({
          where: { userId: id },
          select: {
            id: true,
            subject: true,
            status: true,
            createdAt: true,
            message: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [],
  ]);
  return (
    <>
      <Link href="/admin/khach-hang">← Danh sách khách hàng</Link>
      <section className="dashboard-card customer-profile">
        <h2 data-localize="off">{customer.name}</h2>
        <p>
          {customer.email} · {customer.phone}
        </p>
        <p>
          Ngày tham gia: {customer.createdAt.toLocaleDateString("vi-VN")} ·{" "}
          {customer.active ? "Đang hoạt động" : "Đã khóa"}
        </p>
        <p>
          {customer._count.orders} đơn hàng · Đã thu:{" "}
          {money(paid._sum.amount ?? 0)}
        </p>
        {can(role, "customers.manage") && (
          <ActionButton
            action="admin/customer"
            data={{ id, active: !customer.active }}
          >
            {customer.active ? "Khóa tài khoản" : "Mở tài khoản"}
          </ActionButton>
        )}
      </section>
      <h2>Lịch sử mua hàng</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Ngày đặt</th>
              <th>Trạng thái</th>
              <th>Thanh toán</th>
              <th>Tổng tiền</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  {can(role, "orders.read") ? (
                    <Link href={"/admin/don-hang/" + o.id}>{o.code}</Link>
                  ) : (
                    o.code
                  )}
                </td>
                <td>{o.createdAt.toLocaleDateString("vi-VN")}</td>
                <td>{statusLabels[o.status]}</td>
                <td>{statusLabels[o.paymentStatus]}</td>
                <td>{money(o.total)}</td>
              </tr>
            ))}
            {!orders.length && (
              <tr>
                <td colSpan={5}>Chưa có đơn hàng.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        query={query}
        page={page}
        count={customer._count.orders}
      />
      {can(role, "returns.read") && (
        <section>
          <h2>Đổi trả gần đây</h2>
          {returns.length ? (
            returns.map((r) => (
              <p key={r.id}>
                <Link href={"/admin/doi-tra/" + r.id}>
                  {r.createdAt.toLocaleDateString("vi-VN")} ·{" "}
                  {returnLabels[r.status]}
                </Link>
              </p>
            ))
          ) : (
            <p>Chưa có yêu cầu đổi trả.</p>
          )}
        </section>
      )}
      {can(role, "inquiries.read") && (
        <section>
          <h2>Yêu cầu hỗ trợ gần đây</h2>
          {inquiries.length ? (
            inquiries.map((i) => (
              <details key={i.id}>
                <summary>
                  {i.subject} · {i.createdAt.toLocaleDateString("vi-VN")} ·{" "}
                  {i.status === "RESOLVED"
                    ? "Đã giải quyết"
                    : i.status === "READ"
                      ? "Đã đọc"
                      : "Mới"}
                </summary>
                <p style={{ whiteSpace: "pre-wrap" }}>{i.message}</p>
                <Link href="/admin/lien-he">Xử lý hỗ trợ →</Link>
              </details>
            ))
          ) : (
            <p>Chưa có yêu cầu hỗ trợ từ tài khoản này.</p>
          )}
        </section>
      )}
    </>
  );
}
