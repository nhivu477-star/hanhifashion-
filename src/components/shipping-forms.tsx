"use client";
import { LocalizedContent } from "@/components/localization";

import { useRef, useState } from "react";
import {
  shipmentLabels,
  shipmentTransitions,
  failureLabels,
} from "@/lib/shipping-states";
function ShippingForm({
  operation,
  children,
  id,
}: {
  operation: string;
  children: React.ReactNode;
  id?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const key = useRef<string | null>(null);
  return (
    <LocalizedContent>
      {
        <form
          className="shipping-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            key.current ??= crypto.randomUUID();
            setBusy(true);
            setMessage("");
            try {
              const payload = {
                ...data,
                id,
                eventKey: key.current,
                ...(data.occurredAt
                  ? {
                      occurredAt: new Date(
                        String(data.occurredAt),
                      ).toISOString(),
                    }
                  : {}),
              };
              const r = await fetch(`/api/admin/shipping/${operation}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const body = await r.json();
              if (!r.ok) throw new Error(body.error);
              key.current = null;
              setMessage(body.message);
              if (operation === "create")
                window.location.assign(`/admin/van-chuyen/${body.id}`);
              else window.location.reload();
            } catch (e) {
              setMessage((e as Error).message);
              setBusy(false);
            }
          }}
        >
          {children}
          <button
            className="button outline small-button"
            disabled={busy}
            type="submit"
          >
            {busy ? "Đang ghi nhận…" : "Ghi nhận nội bộ"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      }
    </LocalizedContent>
  );
}
export function ShipmentCreateForm({
  orders,
}: {
  orders: { id: string; code: string }[];
}) {
  return (
    <LocalizedContent>
      {
        <ShippingForm operation="create">
          <h3>Tạo hồ sơ giao nhận</h3>
          <p>Chỉ tạo mã nội bộ HN-SHIP-, không tạo vận đơn hãng.</p>
          <label>
            Đơn đủ điều kiện
            <select name="orderId" required>
              <option value="">Chọn đơn đang chuẩn bị</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phương thức
            <select name="provider" defaultValue="LOCAL_MANUAL">
              <option value="LOCAL_MANUAL">
                Ghi nhận thủ công (LOCAL_MANUAL)
              </option>
            </select>
          </label>
          <label>
            Phí giao (VND)
            <input name="shippingFee" type="number" min="0" step="1" required />
          </label>
          <label>
            Mô tả kiện hàng
            <textarea
              name="parcelDescription"
              required
              minLength={3}
              maxLength={1000}
            />
          </label>
          <label>
            Khối lượng (gram)
            <input name="weightGrams" type="number" min="1" required />
          </label>
          <label>
            Số kiện
            <input
              name="parcelCount"
              type="number"
              min="1"
              max="100"
              defaultValue="1"
              required
            />
          </label>
        </ShippingForm>
      }
    </LocalizedContent>
  );
}
export function ShipmentStatusForm({
  id,
  status,
  grants,
}: {
  id: string;
  status: string;
  grants: readonly string[];
}) {
  if (!shipmentTransitions[status]?.length) return null;
  return (
    <LocalizedContent>
      {
        <ShippingForm operation="status" id={id}>
          <h3>Cập nhật giao nhận thủ công</h3>
          <label>
            Trạng thái mới
            <select name="status">
              {shipmentTransitions[status]
                .filter(
                  (s) =>
                    (s !== "CANCELED" || grants.includes("orders.cancel")) &&
                    (!["DELIVERY_FAILED", "RETURNING", "RETURNED"].includes(
                      s,
                    ) ||
                      grants.includes("shipping.failures.manage")),
                )
                .map((s) => (
                  <option key={s} value={s}>
                    {shipmentLabels[s]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Lý do giao thất bại
            <select name="reasonCode">
              <option value="">Không áp dụng</option>
              {Object.entries(failureLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ghi chú / lý do
            <textarea name="reason" maxLength={1000} />
          </label>
        </ShippingForm>
      }
    </LocalizedContent>
  );
}
export function CODForms({
  id,
  locked,
  provider = "LOCAL_MANUAL",
  grants,
}: {
  id: string;
  locked: boolean;
  provider?: string;
  grants: readonly string[];
}) {
  return (
    <LocalizedContent>
      {
        <div className="shipping-form-grid">
          {!locked &&
            (["collection", "remittance"] as const)
              .filter((kind) =>
                grants.includes(
                  kind === "collection"
                    ? "cod.collection.confirm"
                    : "cod.remittance.record",
                ),
              )
              .map((kind) => (
                <ShippingForm key={kind} operation={kind} id={id}>
                  <h3>
                    {kind === "collection"
                      ? "Hãng đã thu từ khách"
                      : "Hãng đã chuyển tiền về"}
                  </h3>
                  <input type="hidden" name="provider" value={provider} />
                  <label>
                    Số tiền (VND)
                    <input name="amount" type="number" step="1" required />
                  </label>
                  <label>
                    Mã chứng từ / tham chiếu
                    <input
                      name="reference"
                      minLength={3}
                      maxLength={200}
                      required
                    />
                  </label>
                  <label>
                    Bằng chứng / ghi chú nguồn tiền
                    <textarea
                      name="evidence"
                      minLength={3}
                      maxLength={2000}
                      required
                    />
                  </label>
                  <label>
                    Ngày giờ phát sinh
                    <input
                      name="occurredAt"
                      type="datetime-local"
                      step="1"
                      required
                    />
                  </label>
                  <label>
                    ID bản gốc nếu điều chỉnh (bỏ trống khi ghi mới)
                    <input name="correctsId" />
                  </label>
                  <p className="small muted">
                    Điều chỉnh dùng chênh lệch có dấu và liên kết bản gốc. Không
                    sửa/xóa chứng từ đã lưu.
                  </p>
                </ShippingForm>
              ))}
          {grants.includes("cod.reconcile") && (
            <ShippingForm operation="reconcile" id={id}>
              <h3>Đối soát & điều tra</h3>
              <label>
                Thao tác
                <select name="action">
                  <option value="RECONCILE">Đối chiếu và xác nhận</option>
                  <option value="DISPUTE">Mở điều tra / mở lại đối soát</option>
                </select>
              </label>
              <label>
                Kết luận / chứng cứ đối soát
                <textarea name="note" minLength={3} maxLength={2000} required />
              </label>
              <p className="small muted">
                Chỉ xác nhận khi đã giao, thu đủ và chuyển đủ. Chênh lệch tiếp
                tục hiện cảnh báo.
              </p>
            </ShippingForm>
          )}
        </div>
      }
    </LocalizedContent>
  );
}
