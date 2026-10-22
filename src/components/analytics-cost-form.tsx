"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import { useRouter } from "next/navigation";
export function CostForm() {
  const router = useRouter(),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <LocalizedContent>
      {
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const data = Object.fromEntries(new FormData(e.currentTarget));
            const body = Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== ""),
            );
            try {
              const r = await fetch("/api/analytics/cost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const result = await r.json();
              if (!r.ok) throw Error(result.error);
              setMessage("Đã lưu giá vốn có nguồn đối chiếu và nhật ký.");
              router.refresh();
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "Không lưu được.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>Nhập giá vốn có nguồn đối chiếu</h2>
          <p>
            Chỉ nhập khi đã kiểm tra chứng từ. Giá vốn mới áp dụng cho đơn mới;
            để bổ sung lịch sử phải nhập mã dòng hàng và nguồn chứng từ của thời
            điểm bán.
          </p>
          <label>
            SKU sản phẩm
            <input name="sku" maxLength={80} />
          </label>
          <label>
            SKU biến thể (nếu có)
            <input name="variantSku" maxLength={100} />
          </label>
          <label>
            Mã dòng đơn lịch sử (nếu đối chiếu lịch sử)
            <input name="orderItemId" maxLength={80} />
          </label>
          <label>
            Giá vốn mỗi đơn vị (VND)
            <input
              name="unitCost"
              type="number"
              min={0}
              max={100000000}
              required
            />
          </label>
          <label>
            Nguồn chứng từ / căn cứ đã xác minh
            <textarea name="source" minLength={20} maxLength={500} required />
          </label>
          <button disabled={busy}>{busy ? "Đang lưu…" : "Lưu giá vốn"}</button>
          <p role="status">{message}</p>
        </form>
      }
    </LocalizedContent>
  );
}
