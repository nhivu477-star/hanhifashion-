"use client";
import { useState } from "react";
import { usePreferences, LocalizedContent } from "./localization";
export function CurrencySettings() {
  const { config } = usePreferences();
  const [rates, setRates] = useState(JSON.stringify(config.rates, null, 2)),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <LocalizedContent>
      <details>
        <summary>Tỷ giá hiển thị</summary>
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const values = Object.fromEntries(new FormData(e.currentTarget));
            try {
              const r = await fetch("/api/admin/currencies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, rates: JSON.parse(rates) }),
              });
              const data = await r.json();
              if (!r.ok) throw Error(data.error);
              setMessage(data.message);
              window.location.reload();
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Ngày tham chiếu
            <input
              name="asOf"
              type="date"
              defaultValue={config.asOf}
              required
            />
          </label>
          <label>
            Nguồn tỷ giá
            <input
              name="source"
              defaultValue={config.source}
              required
              maxLength={500}
            />
          </label>
          <label>
            Mã tiền tệ / VND mỗi đơn vị (JSON)
            <textarea
              data-localize="off"
              value={rates}
              onChange={(e) => setRates(e.target.value)}
              required
              rows={12}
            />
          </label>
          <p>Giá quy đổi chỉ để tham khảo. Thanh toán luôn bằng VND.</p>
          <button className="button" disabled={busy}>
            Lưu tỷ giá
          </button>
          {error && <p role="alert">{error}</p>}
          <p role="status">{message}</p>
        </form>
      </details>
    </LocalizedContent>
  );
}
