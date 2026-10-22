"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import { useRouter } from "next/navigation";
export function GHNPanel({
  id,
  available,
  verification,
  syncStatus,
  code,
  errorCode,
}: {
  id: string;
  available: boolean;
  verification: string;
  syncStatus: string;
  code: string | null;
  errorCode: string | null;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const router = useRouter();
  async function run(operation: string) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch(`/api/admin/ghn/${operation}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(
        operation === "fee"
          ? `Phí tham khảo: ${new Intl.NumberFormat("vi-VN").format(d.total)}đ · ${d.verification} (không thay tổng đơn)`
          : `${d.disposition ?? "Đã xử lý"} · ${d.verification ?? verification}`,
      );
      router.refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <LocalizedContent>
      {
        <section className="order-actions">
          <h3>GHN STAGING</h3>
          <p>
            {verification === "MOCK_VERIFIED"
              ? "MÔ PHỎNG LOCAL — không phải vận đơn GHN thật"
              : available
                ? "Staging đã có cấu hình; kết nối thật chưa được chứng nhận"
                : "Chưa có cấu hình staging — thao tác API đang khóa"}
          </p>
          <p>
            Đồng bộ: {syncStatus}
            {code ? ` · Mã provider: ${code}` : ""}
          </p>
          {errorCode && (
            <p role="alert" className="error">
              Lỗi API an toàn: {errorCode}
            </p>
          )}
          <div className="admin-actions">
            {[
              ["fee", "Tính phí GHN staging"],
              ["submit", "Gửi / gửi lại có tra cứu trước"],
              ["sync", "Làm mới / tra cứu mã shop"],
            ].map(([op, label]) => (
              <button
                className="button outline small-button"
                key={op}
                disabled={!available || busy}
                onClick={() => run(op)}
              >
                {label}
              </button>
            ))}
          </div>
          <label>
            Lý do hủy vận đơn staging
            <textarea
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="button outline small-button"
            disabled={!available || busy || reason.trim().length < 3 || !code}
            onClick={() => run("cancel")}
          >
            Hủy GHN staging (kiểm tra trước)
          </button>
          {message && <p role="status">{message}</p>}
        </section>
      }
    </LocalizedContent>
  );
}
