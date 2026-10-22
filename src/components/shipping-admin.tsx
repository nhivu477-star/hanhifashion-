import { LocalizedContent } from "@/components/localization";
import { can, rolePermissions } from "@/lib/rbac";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { money, statusLabels } from "@/lib/catalog";
import { Params, scalar } from "@/lib/queries";
import {
  shipmentLabels,
  settlementLabels,
  failureLabels,
} from "@/lib/shipping-states";
import {
  ShipmentCreateForm,
  ShipmentStatusForm,
  CODForms,
} from "./shipping-forms";
const date = (v: Date) =>
  v.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
export async function ShippingAdmin({
  id,
  query,
  role,
}: {
  id?: string;
  query: Params;
  role: string;
}) {
  if (!id) {
    const status = scalar(query.status);
    const [shipments, orders] = await Promise.all([
      db.shipment.findMany({
        where: status ? { status } : {},
        include: { order: { select: { code: true } } },
        orderBy: { createdAt: "desc" },
      }),
      db.order.findMany({
        where: {
          status: "PROCESSING",
          packedAt: { not: null },
          packingHoldReason: null,
          paymentStatus: "UNPAID",
          shippingStatus: "NOT_DISPATCHED",
          shipment: null,
        },
        select: { id: true, code: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return (
      <LocalizedContent>
        {
          <>
            <p>
              {can(role, "cod.read")
                ? "Quản lý giao nhận, thu COD và đối soát. Không giao hàng hoặc chuyển tiền thật."
                : "Quản lý giao nhận và cập nhật tiến trình xử lý kiện hàng."}
            </p>
            <form className="filter-row">
              <label>
                Trạng thái kiện
                <select name="status" defaultValue={status}>
                  <option value="">Tất cả</option>
                  {Object.entries(shipmentLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button outline small-button">Lọc</button>
            </form>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mã tham chiếu / Đơn</th>
                    <th>Giao nhận</th>
                    {can(role, "cod.read") && (
                      <>
                        <th>COD kỳ vọng</th>
                        <th>Đã thu / Đã chuyển</th>
                        <th>Còn phải chuyển</th>
                        <th>Đối soát</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/admin/van-chuyen/${s.id}`}>
                          {s.reference}
                        </Link>
                        <br />
                        <Link href={`/admin/don-hang/${s.orderId}`}>
                          {s.order.code}
                        </Link>
                      </td>
                      <td>
                        <span
                          className={
                            "admin-status admin-status-" +
                            s.status.toLowerCase()
                          }
                        >
                          {shipmentLabels[s.status]}
                        </span>
                      </td>
                      {can(role, "cod.read") && (
                        <>
                          <td>{money(s.expectedCOD)}</td>
                          <td>{money(s.collectedCOD)} / {money(s.remittedCOD)}</td>
                          <td>{money(s.outstandingCOD)}</td>
                          <td>{settlementLabels[s.reconciliationStatus]}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shipments.length && <p>Chưa có hồ sơ giao nhận phù hợp.</p>}
            {can(role, "shipping.create") && (
              <ShipmentCreateForm orders={orders} />
            )}
          </>
        }
      </LocalizedContent>
    );
  }
  const s = await db.shipment.findUnique({
    where: { id },
    include: {
      order: true,
      events: { orderBy: { createdAt: "asc" } },
      attempts: { orderBy: { createdAt: "asc" } },
      collections: { orderBy: { createdAt: "asc" } },
      remittances: { orderBy: { createdAt: "asc" } },
      reconciliations: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!s) notFound();
  const discrepancy =
    (s.collections.length > 0 && s.collectedCOD !== s.expectedCOD) ||
    s.remittedCOD > s.collectedCOD ||
    !!s.discrepancyNote;
  return (
    <LocalizedContent>
      {
        <>
          <Link href="/admin/van-chuyen">← Hồ sơ giao nhận</Link>
          <h2>{s.reference}</h2>
          <p>
            Mã tham chiếu, không phải mã theo dõi của hãng. LOCAL_MANUAL · Ghi
            nhận thủ công
          </p>
          <p>
            <Link href={`/admin/don-hang/${s.orderId}`}>
              Đơn {s.order.code}
            </Link>{" "}
            · {statusLabels[s.order.status]} ·{" "}
            {statusLabels[s.order.paymentStatus]}
          </p>
          <p>Giao nhận: {shipmentLabels[s.status]}</p>
          <p>
            Người nhận: {s.recipientName} · {s.recipientPhone}
            <br />
            {s.recipientAddress}
          </p>
          <p>
            Kiện: {s.parcelDescription} · {s.weightGrams} gram · {s.parcelCount}{" "}
            kiện
          </p>
          <p>
            Phí giao: {money(s.shippingFee)} (không thay đổi phí trong đơn cũ)
          </p>
          {s.provider === "LOCAL_MANUAL" && can(role, "shipping.update") ? (
            <ShipmentStatusForm
              key={s.status}
              id={s.id}
              status={s.status}
              grants={rolePermissions[role] ?? []}
            />
          ) : (
            <p>Hồ sơ tích hợp cũ chỉ để tham khảo; kết nối hãng đã bị khóa.</p>
          )}
          {can(role, "cod.read") && (
            <>
              <h2>COD & đối soát</h2>
              <div className="metrics">
                <div>
                  <span>COD kỳ vọng</span>
                  <strong>{money(s.expectedCOD)}</strong>
                </div>
                <div>
                  <span>Hãng đã thu từ khách</span>
                  <strong>{money(s.collectedCOD)}</strong>
                </div>
                <div>
                  <span>Hãng đã chuyển về</span>
                  <strong>{money(s.remittedCOD)}</strong>
                </div>
                <div>
                  <span>Hãng còn phải chuyển</span>
                  <strong>{money(s.outstandingCOD)}</strong>
                </div>
                <div>
                  <span>Khách còn thiếu</span>
                  <strong>
                    {money(Math.max(0, s.expectedCOD - s.collectedCOD))}
                  </strong>
                </div>
              </div>
              <p>Đối soát: {settlementLabels[s.reconciliationStatus]}</p>
              {discrepancy && (
                <p className="error" role="alert">
                  Chênh lệch cần điều tra: thu so với kỳ vọng{" "}
                  {money(s.collectedCOD - s.expectedCOD)}; chuyển so với đã thu{" "}
                  {money(s.remittedCOD - s.collectedCOD)}. {s.discrepancyNote}
                </p>
              )}
              {s.outstandingCOD > 0 && (
                <p>
                  Chưa chuyển đủ: {money(s.outstandingCOD)}. Khoản này chưa được
                  đối soát hoàn tất.
                </p>
              )}
              {s.reconciledAt && (
                <p>
                  Đối soát lúc {date(s.reconciledAt)} · {s.reconciledBy} ·{" "}
                  {s.reconciliationNote}
                </p>
              )}
              <CODForms
                grants={rolePermissions[role] ?? []}
                provider={s.provider}
                id={s.id}
                locked={s.reconciliationStatus === "RECONCILED"}
              />
              {(
                [
                  ["Chứng từ thu COD", s.collections],
                  ["Chứng từ chuyển tiền", s.remittances],
                ] as const
              ).map(([title, rows]) => (
                <section key={title}>
                  <h3>{title}</h3>
                  {rows.map((r) => (
                    <p key={r.id}>
                      ID: {r.id} · {money(r.amount)} · {r.reference} ·{" "}
                      {date(r.occurredAt)} · {r.provider}
                      <br />
                      {r.evidence} · Người ghi: {r.actorId}
                      {r.correctsId ? ` · Điều chỉnh bản ${r.correctsId}` : ""}
                    </p>
                  ))}
                </section>
              ))}
              <h3>Lịch sử đối soát</h3>
              {s.reconciliations.map((r) => (
                <p key={r.id}>
                  {date(r.createdAt)} · {settlementLabels[r.previousStatus]} →{" "}
                  {settlementLabels[r.status]} · {r.actorId}
                  <br />
                  {r.note} · Thu {money(r.collected)} / Chuyển{" "}
                  {money(r.remitted)}
                </p>
              ))}
            </>
          )}
          <h3>Lịch sử giao nhận</h3>
          {s.events.map((e) => (
            <p key={e.id}>
              {date(e.createdAt)} ·{" "}
              {e.previousStatus ? `${shipmentLabels[e.previousStatus]} → ` : ""}
              {shipmentLabels[e.status]} · {e.source} · {e.actorId}
              <br />
              {e.reason}
            </p>
          ))}
          {s.provider === "GHN_STAGING" && role === "ADMIN" && (
            <section>
              <h3>Sự kiện provider (chỉ quản trị)</h3>
              {s.events
                .filter((e) => e.providerEventKey)
                .map((e) => (
                  <p key={e.id}>
                    {date(e.createdAt)} · {e.providerEventType} ·{" "}
                    {e.providerStatus} · {e.disposition}
                    <br />
                    Thời gian GHN: {e.providerTimestamp?.toISOString()}
                    <br />
                    <code>{e.providerPayload}</code>
                  </p>
                ))}
            </section>
          )}
          <h3>Lần giao không thành công</h3>
          {s.attempts.map((a) => (
            <p key={a.id}>
              {date(a.createdAt)} · {failureLabels[a.reasonCode]} · {a.note} ·{" "}
              {a.actorId}
            </p>
          ))}
        </>
      }
    </LocalizedContent>
  );
}
