"use client";
import { useRef, useState } from "react";
export function PackingChecklist({
  id,
  items,
}: {
  id: string;
  items: {
    id: string;
    name: string;
    sku: string;
    color: string;
    size: string;
    quantity: number;
  }[];
}) {
  const [checked, setChecked] = useState<string[]>([]),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = useRef("");
  const packableItems = items.filter((i) => i.quantity > 0);
  async function save(kind: "PACK" | "HOLD") {
    setBusy(true);
    setError("");
    key.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/admin/order/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          eventKey: key.current,
          kind,
          reason,
          items:
            kind === "PACK"
              ? packableItems.map((i) => ({
                  id: i.id,
                  quantity: i.quantity,
                  checked: checked.includes(i.id),
                }))
              : [],
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        key.current = "";
        throw Error(d.error);
      }
      window.location.reload();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <section className="dashboard-card packing-checklist">
      <h2>Kiểm tra và đóng gói</h2>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void save("PACK");
        }}
      >
        {packableItems.map((i) => (
          <label className="check-row" key={i.id}>
            <input
              type="checkbox"
              checked={checked.includes(i.id)}
              onChange={(e) => {
                setChecked(
                  e.target.checked
                    ? [...checked, i.id]
                    : checked.filter((id) => id !== i.id),
                );
                key.current = "";
              }}
            />
            Đã kiểm đúng {i.sku} · {i.color} / {i.size} · {i.quantity} sản
            phẩm
          </label>
        ))}
        <label>
          Ghi nhận kiểm tra đóng gói
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              key.current = "";
            }}
          />
        </label>
        <div className="admin-actions">
          <button
            className="button"
            type="submit"
            disabled={busy || checked.length !== packableItems.length}
          >
            Xác nhận đã đóng gói
          </button>
          <button
            className="button outline"
            type="button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void save("HOLD")}
          >
            Tạm dừng để kiểm tra hàng
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
