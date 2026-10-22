"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import { api } from "./store";
export function InventoryOperationForm() {
  const [kind, setKind] = useState("IN"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [eventKey, setKey] = useState("");
  return (
    <LocalizedContent>
      {
        <details>
          <summary>Nhập / xuất kho theo SKU</summary>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setMessage("");
              const form = e.currentTarget;
              const values = Object.fromEntries(new FormData(form));
              const key = eventKey || crypto.randomUUID();
              setKey(key);
              try {
                await api("admin/inventory-movement", {
                  ...values,
                  kind,
                  date: new Date(String(values.date)).toISOString(),
                  eventKey: key,
                });
                window.location.reload();
              } catch (error) {
                setMessage((error as Error).message);
                setBusy(false);
              }
            }}
            onChange={() => {
              setKey("");
            }}
          >
            <label>
              Thao tác
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="IN">Nhập kho</option>
                <option value="OUT">Xuất kho</option>
              </select>
            </label>
            <label>
              SKU
              <input name="sku" required maxLength={150} />
            </label>
            <label>
              Số lượng
              <input
                name="quantity"
                type="number"
                min="1"
                max="100000"
                required
              />
            </label>
            <label>
              Ngày thực hiện
              <input name="date" type="datetime-local" step="1" required />
            </label>
            {kind === "IN" && (
              <label>
                Nhà cung cấp
                <input name="supplier" required maxLength={200} />
              </label>
            )}
            <label>
              Lý do
              <input name="reason" required minLength={3} maxLength={300} />
            </label>
            <label>
              Ghi chú
              <textarea name="notes" maxLength={1000} />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Đang lưu…" : "Lưu biến động kho"}
            </button>
            <p role="status">{message}</p>
          </form>
        </details>
      }
    </LocalizedContent>
  );
}
