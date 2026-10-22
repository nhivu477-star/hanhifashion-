"use client";
import { LocalizedContent } from "@/components/localization";

import { useRef, useState } from "react";
export function ReturnRequestForm({
  orderId,
  items,
}: {
  orderId: string;
  items: {
    id: string;
    name: string;
    size: string;
    color: string;
    remaining: number;
  }[];
}) {
  const key = useRef<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <LocalizedContent>
      {
        <form
          className="shipping-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            try {
              const d = new FormData(e.currentTarget);
              const evidence = [];
              for (const file of d.getAll("evidence")) {
                if (file instanceof File && file.size) {
                  if (file.size > 2000000) throw Error("Mỗi ảnh tối đa 2MB.");
                  const data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(Error("Không đọc được ảnh."));
                    reader.readAsDataURL(file);
                  });
                  evidence.push({ data });
                }
              }
              key.current ??= crypto.randomUUID();
              const payload = {
                orderId,
                eventKey: key.current,
                claimType: "DEFECT",
                resolution: d.get("resolution"),
                reason: d.get("reason"),
                items: items
                  .map((i) => ({
                    orderItemId: i.id,
                    quantity: Number(d.get(`quantity:${i.id}`)),
                  }))
                  .filter((i) => i.quantity > 0),
                evidence,
              };
              const r = await fetch("/api/returns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const body = await r.json();
              if (!r.ok) throw Error(body.error);
              key.current = null;
              setMessage(body.message);
              window.location.reload();
            } catch (err) {
              setMessage((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Gửi yêu cầu về sản phẩm có lỗi</h3>
          <p>
            Trong 72 giờ từ khi nhận hàng. Chỉ tiếp nhận lỗi để xem xét; không
            đổi size/màu theo nhu cầu cá nhân.
          </p>
          {items.map((i) => (
            <label key={i.id}>
              {i.name} · {i.color} / {i.size} — còn {i.remaining} sản phẩm có
              thể yêu cầu
              <input
                aria-label={`Số lượng trả ${i.name}`}
                name={`quantity:${i.id}`}
                type="number"
                min="0"
                max={i.remaining}
                defaultValue="0"
                disabled={!i.remaining}
              />
            </label>
          ))}
          <label>
            Phương án mong muốn
            <select name="resolution">
              <option value="REFUND">Hoàn tiền</option>
              <option value="EXCHANGE">Đổi sản phẩm do lỗi</option>
            </select>
          </label>
          <label>
            Mô tả lỗi
            <textarea name="reason" minLength={10} maxLength={2000} required />
          </label>
          <label>
            Ảnh chứng minh (không bắt buộc, tối đa 3 ảnh, 2MB/ảnh)
            <input
              name="evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
            />
          </label>
          <button className="button outline" disabled={busy}>
            {busy ? "Đang gửi…" : "Gửi yêu cầu đổi trả"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      }
    </LocalizedContent>
  );
}
export function ReturnAction({
  id,
  operation,
  children,
  label,
  extra = {},
}: {
  id: string;
  operation: string;
  children?: React.ReactNode;
  label: string;
  extra?: Record<string, unknown>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <LocalizedContent>
      {
        <form
          className="shipping-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget),
              payload: Record<string, unknown> = {
                id,
                ...extra,
                reason: data.get("reason"),
              };
            for (const [key, value] of data)
              if (key !== "reason" && !key.startsWith("replacement:"))
                payload[key] = value;
            if (operation === "refund")
              payload.refundShipping = data.get("refundShipping") === "on";
            if (operation === "exchange")
              payload.replacements = [...data]
                .filter(([key]) => key.startsWith("replacement:"))
                .map(([key, value]) => ({
                  itemId: key.slice(12),
                  variantId: value,
                }));
            setBusy(true);
            setMessage("");
            try {
              const r = await fetch(`/api/admin/returns/${operation}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const body = await r.json();
              if (!r.ok) throw Error(body.error);
              setMessage(body.message);
              window.location.reload();
            } catch (err) {
              setMessage((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {children}
          <label>
            Lý do / kết quả (hiển thị trong lịch sử khách nếu là trạng thái)
            <textarea name="reason" minLength={3} maxLength={2000} required />
          </label>
          <button className="button outline small-button" disabled={busy}>
            {busy ? "Đang ghi nhận…" : label}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      }
    </LocalizedContent>
  );
}
