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
  items = [],
}: {
  id: string;
  code?: string;
  status: string;
  paymentStatus: string;
  admin?: boolean;
  hasShipment?: boolean;
  grants?: readonly string[];
  items?: {
    id: string;
    name: string;
    color: string;
    size: string;
    quantity: number;
  }[];
}) {
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [inspection, setInspection] = useState<
    Partial<Record<string, { sellableQuantity: number | ""; damagedQuantity: number | "" }>>
  >({});
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
    setMessage("");
    const returnedItems: {
      orderItemId: string;
      sellableQuantity: number;
      damagedQuantity: number;
    }[] = [];
    if (status === "RETURNED" && next === "CANCELLED") {
      if (!reason.trim()) {
        setMessage("Vui lòng nhập lý do hủy và kết quả kiểm hàng hoàn về.");
        return;
      }
      if (!items.length) {
        setMessage("Không có dòng hàng để kiểm nhận. Vui lòng tải lại đơn.");
        return;
      }
      for (const item of items) {
        const row = inspection[item.id];
        if (
          !row ||
          row.sellableQuantity === "" ||
          row.damagedQuantity === "" ||
          !Number.isInteger(row.sellableQuantity) ||
          !Number.isInteger(row.damagedQuantity) ||
          row.sellableQuantity < 0 ||
          row.damagedQuantity < 0 ||
          row.sellableQuantity + row.damagedQuantity !== item.quantity
        ) {
          setMessage(`Phân loại đủ ${item.quantity} sản phẩm của ${item.name} thành hàng có thể bán và hàng hư hỏng.`);
          return;
        }
        returnedItems.push({
          orderItemId: item.id,
          sellableQuantity: row.sellableQuantity,
          damagedQuantity: row.damagedQuantity,
        });
      }
    }
    setBusy(true);
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
          ...(status === "RETURNED" && next === "CANCELLED" ? { returnedItems } : {}),
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
          {admin && status === "RETURNED" && choices.includes("CANCELLED") && (
            <fieldset className="returned-inspection">
              <legend>Kiểm nhận hàng hoàn về trước khi hủy</legend>
              <p className="small muted">
                Phân loại toàn bộ số lượng của từng dòng hàng. Chỉ hàng có thể bán
                được nhập lại tồn khả dụng; hàng hư hỏng được ghi nhận, không mở bán.
              </p>
              {items.map((item) => (
                <div className="returned-inspection-line" key={item.id}>
                  <strong>
                    {item.name} · {item.color} / {item.size} · {item.quantity} sản phẩm
                  </strong>
                  {([
                    ["sellableQuantity", "Có thể bán"],
                    ["damagedQuantity", "Hư hỏng"],
                  ] as const).map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        step={1}
                        required
                        disabled={busy}
                        aria-label={`${label} — ${item.name} — ${item.color} / ${item.size}`}
                        value={inspection[item.id]?.[field] ?? ""}
                        onChange={(e) => {
                          const value = e.target.value === "" ? "" : Number(e.target.value);
                          setInspection((current) => ({
                            ...current,
                            [item.id]: {
                              ...(current[item.id] ?? { sellableQuantity: "", damagedQuantity: "" }),
                              [field]: value,
                            },
                          }));
                        }}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </fieldset>
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
          {message && <p role="alert">{message}</p>}
        </div>
      }
    </LocalizedContent>
  );
}
