import { LocalizedContent } from "@/components/localization";
import { publicWording, refundStatusLabels } from "@/lib/public-wording";
import { can } from "@/lib/rbac";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { customerReturns, deliveryTime } from "@/lib/returns";
import {
  inReturnWindow,
  returnDeadline,
  returnLabels,
  returnTransitions,
  dispositionLabels,
} from "@/lib/returns-rules";
import { money } from "@/lib/catalog";
import { shipmentLabels, shipmentTransitions } from "@/lib/shipping-states";
import { Params, scalar } from "@/lib/queries";
import { ReturnRequestForm, ReturnAction } from "./return-forms";
const date = (v: Date) =>
  v.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export async function CustomerReturns({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: { items: true },
  });
  if (!order) return null;
  const [requests, time] = await Promise.all([
    customerReturns(orderId, userId),
    deliveryTime(db, orderId),
  ]);
  const reserved = await db.returnItem.findMany({
    where: { request: { orderId, userId, released: false } },
    select: { orderItemId: true, quantity: true },
  });
  const remaining = order.items.map((i) => ({
    ...i,
    remaining:
      i.quantity -
      reserved
        .filter((x) => x.orderItemId === i.id)
        .reduce((s, x) => s + x.quantity, 0),
  }));
  const eligible =
    ["DELIVERED", "COMPLETED"].includes(order.status) &&
    time &&
    inReturnWindow(time);
  return (
    <LocalizedContent>
      {
        <section className="returns-section">
          <h2>Đổi trả & hoàn tiền</h2>
          <p><Link className="button outline" href={"/tai-khoan/ho-tro?don=" + orderId}>Nhắn Shop về đơn hàng này</Link></p>
          <p>
            Theo dõi giao nhận và tiến trình hoàn tiền.{" "}
            <Link href="/chinh-sach-doi-tra">Xem chính sách đổi trả</Link>
          </p>
          {eligible && remaining.some((i) => i.remaining > 0) ? (
            <ReturnRequestForm orderId={orderId} items={remaining} />
          ) : (
            <p>
              {time && !inReturnWindow(time)
                ? "Đã hết thời hạn 72 giờ. Liên hệ cửa hàng nếu cần xem xét trường hợp đặc biệt."
                : remaining.every((i) => i.remaining === 0)
                  ? "Sản phẩm đã có hồ sơ đổi trả; không còn số lượng để gửi thêm."
                  : "Đơn chưa đủ điều kiện hoặc cần xác minh mốc nhận hàng. Vui lòng liên hệ cửa hàng."}
            </p>
          )}
          {time && (
            <p>
              Nhận hàng: {date(time)} · Hạn gửi: {date(returnDeadline(time))}
            </p>
          )}
          {requests.map((r) => (
            <article className="return-record" key={r.id}>
              <h3>{r.reference}</h3>
              <p role="status">
                {returnLabels[r.status]} ·{" "}
                {r.resolution === "EXCHANGE" ? "Đổi hàng do lỗi" : "Hoàn tiền"}
              </p>
              <p>{publicWording(r.reason)}</p>
              {r.items.map((i) => (
                <div key={i.id}>
                  <p>
                    {i.orderItem.name} · {i.orderItem.color}/{i.orderItem.size}{" "}
                    × {i.quantity}
                  </p>
                  {i.exchange && (
                    <p>
                      Hàng thay thế: {i.exchange.name} · {i.exchange.color}/
                      {i.exchange.size} × {i.exchange.quantity} ·{" "}
                      {shipmentLabels[i.exchange.status]}
                      <br />
                      Mã tham chiếu: {i.exchange.reference}
                    </p>
                  )}
                </div>
              ))}
              {r.refund && (
                <p>
                  <strong>Hoàn tiền — {money(r.refund.amount)}</strong>
                  <br />
                  {r.refund.reference} ·{" "}
                  {refundStatusLabels[r.refund.status] ??
                    publicWording(r.refund.status)}
                  <br />
                  Không chuyển tiền thật.
                </p>
              )}
              <details>
                <summary>Lịch sử xử lý</summary>
                {r.history.map((h) => (
                  <p key={h.id}>
                    {date(h.createdAt)} · {returnLabels[h.status]}
                    <br />
                    {publicWording(h.reason)}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </section>
      }
    </LocalizedContent>
  );
}
export async function ReturnsAdmin({
  id,
  query,
  role,
}: {
  id?: string;
  query: Params;
  role: string;
}) {
  if (!id) {
    const status = scalar(query.status),
      q = scalar(query.q);
    const requests = await db.returnRequest.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(q ? { order: { code: { contains: q } } } : {}),
      },
      include: { order: { select: { code: true } } },
      orderBy: { createdAt: "desc" },
    });
    return (
      <LocalizedContent>
        {
          <>
            <h2>Đổi trả & hoàn</h2>
            <p>
              Chỉ xử lý local. Không chuyển tiền thật; giữ chính sách 72 giờ khi
              sản phẩm có lỗi.
            </p>
            <form className="filter-row">
              <label>
                Mã đơn
                <input name="q" defaultValue={q} />
              </label>
              <label>
                Trạng thái
                <select name="status" defaultValue={status}>
                  <option value="">Tất cả</option>
                  {Object.entries(returnLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button outline small-button">Lọc hồ sơ</button>
            </form>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Đơn hàng</th>
                    <th>Trạng thái</th>
                    <th>Ngày gửi</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/admin/doi-tra/${r.id}`}>
                          {r.reference}
                        </Link>
                      </td>
                      <td>{r.order.code}</td>
                      <td>{returnLabels[r.status]}</td>
                      <td>{date(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!requests.length && <p>Chưa có yêu cầu phù hợp.</p>}
          </>
        }
      </LocalizedContent>
    );
  }
  const r = await db.returnRequest.findUnique({
    where: { id },
    include: {
      order: { include: { shipment: true } },
      items: {
        include: {
          orderItem: true,
          inspections: { orderBy: { createdAt: "asc" } },
          exchange: true,
        },
      },
      evidence: role === "ADMIN" ? { select: { id: true } } : false,
      history: { orderBy: { createdAt: "asc" } },
      refund: true,
    },
  });
  if (!r) notFound();
  const variants =
    r.status === "INSPECTED" && r.resolution === "EXCHANGE"
      ? await db.productVariant.findMany({
          where: { product: { active: true }, stock: { gt: 0 } },
          include: { product: { select: { name: true } } },
          orderBy: { sku: "asc" },
        })
      : [];
  const movements = await db.inventoryMovement.findMany({
    where: {
      orderId: r.orderId,
      OR: r.items.flatMap((i) => [
        { reason: `RETURN_RESTOCK:${i.id}` },
        ...(i.exchange
          ? [
              { reason: `EXCHANGE_ALLOCATED:${i.exchange.id}` },
              { reason: `EXCHANGE_CANCELED:${i.exchange.id}` },
            ]
          : []),
      ]),
    },
    orderBy: { createdAt: "asc" },
  });
  const audits = await db.auditLog.findMany({
    where: { targetId: id },
    orderBy: { createdAt: "asc" },
  });
  const next = (
    r.status === "REFUND_PENDING" ? [] : (returnTransitions[r.status] ?? [])
  ).filter(
    (s) =>
      ["UNDER_REVIEW", "APPROVED", "REJECTED", "RECEIVED", "CLOSED"].includes(
        s,
      ) && can(role, s === "RECEIVED" ? "returns.inspect" : "returns.review"),
  );
  return (
    <LocalizedContent>
      {
        <>
          <Link href="/admin/doi-tra">← Danh sách đổi trả</Link>
          <h2>{r.reference}</h2>
          <p>
            <Link href={`/admin/don-hang/${r.orderId}`}>
              Đơn {r.order.code}
            </Link>{" "}
            · {returnLabels[r.status]}
          </p>
          <p>
            Khách yêu cầu:{" "}
            {r.resolution === "EXCHANGE" ? "Đổi hàng do lỗi" : "Hoàn"} ·{" "}
            {publicWording(r.reason)}
          </p>
          <p>
            Mốc nhận hàng: {date(r.deliveredAt)} · Hạn: {date(r.deadline)} ·
            Chính sách: {r.policyVersion}
          </p>
          <p>
            Duyệt nghĩa là đã xác minh lỗi và thống nhất phương án với khách.
            Không duyệt đổi theo sở thích.
          </p>
          {role === "ADMIN" && <div className="return-evidence">
            {r.evidence.map((e) => (
              <a
                key={e.id}
                href={`/api/returns/evidence/${e.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={`/api/returns/evidence/${e.id}`}
                  alt="Ảnh lỗi khách cung cấp"
                />
              </a>
            ))}
          </div>}
          {next.length > 0 && (
            <ReturnAction
              key={r.status}
              id={id}
              operation="status"
              label="Cập nhật hồ sơ"
            >
              <label>
                Trạng thái mới
                <select name="status">
                  {next.map((s) => (
                    <option key={s} value={s}>
                      {returnLabels[s]}
                    </option>
                  ))}
                </select>
              </label>
            </ReturnAction>
          )}
          <h3>Sản phẩm & kiểm hàng</h3>
          {r.items.map((i) => (
            <article className="return-record" key={i.id}>
              <p>
                {i.orderItem.name} · {i.orderItem.sku} · {i.orderItem.color}/
                {i.orderItem.size} × {i.quantity}
                <br />
                Giá trị hàng hoàn sau giảm giá: {money(i.amount)}
              </p>
              <p>
                {i.disposition
                  ? dispositionLabels[i.disposition]
                  : "Chưa kiểm hàng"}{" "}
                ·{" "}
                {i.restocked
                  ? "Đã cộng tồn bán được"
                  : "Chưa cộng tồn bán được"}
              </p>
              {can(role, "returns.inspect") &&
                r.status === "RECEIVED" &&
                (!i.disposition || i.disposition === "REVIEW") && (
                  <ReturnAction
                    id={id}
                    operation="inspect"
                    extra={{ itemId: i.id }}
                    label="Lưu kiểm hàng"
                  >
                    <label>
                      Kết quả kiểm hàng
                      <select name="condition" defaultValue="" required>
                        <option value="">Chọn kết quả kiểm hàng</option>
                        {Object.entries(dispositionLabels)
                          .filter(
                            ([key]) =>
                              key !== "SELLABLE" ||
                              can(role, "inventory.adjust"),
                          )
                          .map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Bằng chứng kiểm tra nội bộ
                      <textarea
                        name="evidence"
                        minLength={3}
                        maxLength={2000}
                        required
                      />
                    </label>
                  </ReturnAction>
                )}
              {i.inspections.map((x) => (
                <p key={x.id}>
                  {date(x.createdAt)} · {x.actorId} ·{" "}
                  {dispositionLabels[x.condition]}
                  <br />
                  {x.notes}
                  <br />
                  Bằng chứng: {x.evidence}
                </p>
              ))}
              {i.exchange && (
                <>
                  <p>
                    SKU thay thế: {i.exchange.sku} · {i.exchange.color}/
                    {i.exchange.size} · {shipmentLabels[i.exchange.status]}
                    <br />
                    Mã tham chiếu: {i.exchange.reference}
                  </p>
                  {can(role, "returns.exchange") &&
                    can(role, "shipping.update") &&
                    r.status === "EXCHANGE_PENDING" &&
                    shipmentTransitions[i.exchange.status]?.length > 0 && (
                      <ReturnAction
                        id={id}
                        key={i.exchange.status}
                        operation="exchange-status"
                        extra={{ exchangeId: i.exchange.id }}
                        label="Cập nhật kiện thay thế"
                      >
                        <label>
                          Trạng thái kiện
                          <select name="status">
                            {shipmentTransitions[i.exchange.status].map((s) => (
                              <option key={s} value={s}>
                                {shipmentLabels[s]}
                              </option>
                            ))}
                          </select>
                        </label>
                      </ReturnAction>
                    )}
                </>
              )}
            </article>
          ))}
          {can(role, "returns.exchange") &&
            r.status === "INSPECTED" &&
            r.resolution === "EXCHANGE" && (
              <ReturnAction
                id={id}
                operation="exchange"
                label="Phân bổ hàng thay thế"
              >
                <p>
                  Chỉ SKU cùng đơn giá lịch sử. Không tự xử lý chênh lệch giá.
                </p>
                {r.items.map((i) => (
                  <label key={i.id}>
                    SKU thay thế cho {i.orderItem.name}
                    <select name={`replacement:${i.id}`} required>
                      <option value="">Chọn SKU</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.sku} · {v.product.name} · {v.color}/{v.size} · tồn{" "}
                          {v.stock}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </ReturnAction>
            )}
          {can(role, "cod.read") && r.order.shipment && (
            <p>
              COD gốc: đã thu {money(r.order.shipment.collectedCOD)}, đã chuyển{" "}
              {money(r.order.shipment.remittedCOD)}, còn{" "}
              {money(r.order.shipment.outstandingCOD)} ·{" "}
              {r.order.shipment.reconciliationStatus}. Hoàn không sửa đối soát
              này.
            </p>
          )}
          {can(role, "refunds.approve") &&
            r.status === "INSPECTED" &&
            r.resolution === "REFUND" && (
              <ReturnAction
                id={id}
                operation="refund"
                label="Tính và tạo khoản hoàn"
              >
                <label>
                  <input name="refundShipping" type="checkbox" /> Hoàn phí giao
                  ban đầu (chỉ khi trả toàn bộ đơn do lỗi đã xác nhận)
                </label>
              </ReturnAction>
            )}
          {can(role, "refunds.read") && r.refund && (
            <section>
              <h3>Hoàn tiền</h3>
              <p>
                {r.refund.reference} · {money(r.refund.amount)} ·{" "}
                {refundStatusLabels[r.refund.status] ??
                  publicWording(r.refund.status)}
              </p>
              <p>
                Phí giao trong khoản hoàn: {money(r.refund.shippingAmount)} ·
                Payment {r.refund.paymentId}
                <br />
                Duyệt: {r.refund.approvalActor ?? "Chưa duyệt"} · Hoàn tất:{" "}
                {r.refund.completionActor ?? "Chưa hoàn tất"}
              </p>
              {["PENDING", "APPROVED"].includes(r.refund.status) &&
                (can(role, "refunds.approve") ||
                  can(role, "refunds.execute")) && (
                  <ReturnAction
                    id={id}
                    key={
                      refundStatusLabels[r.refund.status] ??
                      publicWording(r.refund.status)
                    }
                    operation="refund-status"
                    label="Ghi nhận hoàn tiền"
                  >
                    <label>
                      Trạng thái hoàn
                      <select name="status">
                        {(r.refund.status === "PENDING"
                          ? ["APPROVED", "REJECTED", "CANCELED"]
                          : ["SIMULATED_COMPLETED", "CANCELED"]
                        )
                          .filter((s) =>
                            can(
                              role,
                              s === "SIMULATED_COMPLETED"
                                ? "refunds.execute"
                                : "refunds.approve",
                            ),
                          )
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                      </select>
                    </label>
                  </ReturnAction>
                )}
            </section>
          )}
          <h3>Lịch sử đầy đủ</h3>
          {r.history
            .filter(
              (h) =>
                can(role, "refunds.read") ||
                (h.status !== "REFUND_PENDING" &&
                  h.previousStatus !== "REFUND_PENDING"),
            )
            .map((h) => (
              <p key={h.id}>
                {date(h.createdAt)} · {h.actorId} · {h.previousStatus ?? "—"} →{" "}
                {h.status}
                <br />
                {publicWording(h.reason)}
              </p>
            ))}
          {can(role, "inventory.movements.read") && (
            <details>
              <summary>Biến động tồn kho</summary>
              {movements.map((m) => (
                <p key={m.id}>
                  {date(m.createdAt)} · {m.variantId} · {m.delta} · {m.reason}
                </p>
              ))}
              {!movements.length && <p>Chưa có biến động tồn kho.</p>}
            </details>
          )}
          {can(role, "audit.read") && (
            <details>
              <summary>Audit log</summary>
              {audits.map((a) => (
                <p key={a.id}>
                  {date(a.createdAt)} · {a.actorId} · {a.action}
                  <br />
                  {a.detail}
                </p>
              ))}
            </details>
          )}
        </>
      }
    </LocalizedContent>
  );
}
