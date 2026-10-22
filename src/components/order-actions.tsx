"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import { statusLabels, transitions } from "@/lib/catalog";
export function OrderActions({
  id,
  code,
  status,
  paymentStatus,
  admin = false,
  hasShipment = false,
  grants = [],
}: {
  id: string;
  code?: string;
  status: string;
  paymentStatus: string;
  admin?: boolean;
  hasShipment?: boolean;
  grants?: readonly string[];
}) {
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const choices = admin
    ? (transitions[status] ?? []).filter(
        (next) =>
          (next === "CANCELLED"
            ? grants.includes("orders.cancel")
            : grants.includes("orders.manage")) &&
          (!hasShipment ||
            !["SHIPPING", "DELIVERED", "DELIVERY_FAILED", "RETURNED"].includes(
              next,
            )),
      )
    : ["PENDING", "CONFIRMED"].includes(status) && paymentStatus === "UNPAID"
      ? ["CANCELLED"]
      : [];
  const canCollect =
    admin &&
    grants.includes("cod.collection.confirm") &&
    !hasShipment &&
    ["DELIVERED", "COMPLETED"].includes(status) &&
    paymentStatus === "UNPAID";
  if (!choices.length && !canCollect) return null;
  async function submit(next: string, paid = false) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(admin ? "/api/admin/order" : "/api/order/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          code,
          status: next,
          paid,
          reason,
          reference,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Không thể cập nhật đơn.");
      setMessage(data.message);
      // Read the committed order snapshot before offering the next transition.
      window.location.reload();
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <LocalizedContent>
      {
        <div className="order-actions">
          <label>
            {admin
              ? "Lý do / ghi nhận giao nhận, nguồn thu COD"
              : "Lý do hủy đơn"}
            <textarea
              aria-label={admin ? "Lý do xử lý đơn" : "Lý do hủy đơn"}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {admin && (
            <>
              <p className="small muted">
                Giao nhận được nhân viên ghi nhận thủ công, chưa kết nối hãng
                vận chuyển.
              </p>
              <label>
                Mã tham chiếu giao nhận / chứng từ COD
                <input
                  value={reference}
                  maxLength={200}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
            </>
          )}
          <div className="admin-actions">
            {choices.map((next) => (
              <button
                className="button outline small-button"
                disabled={busy}
                key={next}
                onClick={() => submit(next)}
              >
                {!admin ? "Yêu cầu hủy đơn" : statusLabels[next]}
              </button>
            ))}
            {canCollect && (
              <button
                className="button outline small-button"
                disabled={busy}
                onClick={() => submit(status, true)}
              >
                Xác nhận đã thực nhận tiền COD
              </button>
            )}
          </div>
          {!admin && (
            <p className="small muted">
              Đơn chưa thanh toán, chưa chuẩn bị hàng sẽ được hủy ngay nếu còn
              đủ điều kiện.
            </p>
          )}
          {message && <p role="status">{message}</p>}
        </div>
      }
    </LocalizedContent>
  );
}
