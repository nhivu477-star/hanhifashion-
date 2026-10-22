"use client";
import { useRef, useState } from "react";
import { money } from "@/lib/catalog";
export function PartialCancellation({
  id,
  items,
  admin = false,
}: {
  id: string;
  items: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
  }[];
  admin?: boolean;
}) {
  const available = items.filter((i) => i.quantity > 0);
  const [itemId, setItemId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const key = useRef("");
  const line = available.find((i) => i.id === itemId);
  if (available.reduce((sum, i) => sum + i.quantity, 0) < 2) return null;
  return (
    <details className="partial-cancellation">
      <summary>Hủy một phần đơn hàng</summary>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          key.current ||= crypto.randomUUID();
          try {
            const response = await fetch(
              admin
                ? "/api/admin/order-items-cancel"
                : "/api/order/cancel-items",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id,
                  eventKey: key.current,
                  items: [{ id: itemId, quantity }],
                  reason,
                }),
              },
            );
            const result = await response.json();
            if (!response.ok) {
              key.current = "";
              throw Error(result.error ?? "Không thể hủy sản phẩm.");
            }
            window.location.reload();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <label>
          Sản phẩm cần hủy
          <select
            value={itemId}
            onChange={(e) => {
              setItemId(e.target.value);
              setQuantity(1);
              key.current = "";
            }}
          >
            {available.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {i.sku} · {money(i.unitPrice)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Số lượng hủy
          <input
            type="number"
            min={1}
            max={line?.quantity ?? 1}
            required
            value={quantity}
            onChange={(e) => {
              setQuantity(Number(e.target.value));
              key.current = "";
            }}
          />
        </label>
        <label>
          Lý do hủy một phần
          <textarea
            minLength={3}
            maxLength={1000}
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              key.current = "";
            }}
          />
        </label>
        <p className="small muted">
          Giữ giá đã đặt và phí giao hàng; giảm giá được phân bổ theo phần hàng
          hủy. Tổng tiền mới được cập nhật sau khi xác nhận.
        </p>
        <button className="button outline" disabled={busy} type="submit">
          {busy ? "Đang xử lý…" : "Xác nhận hủy sản phẩm"}
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
