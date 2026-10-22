"use client";
import { useRef, useState } from "react";
export function StocktakeCreateForm() {
  const [lines, setLines] = useState([
      { sku: "", countedStock: 0, damagedStock: 0 },
    ]),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const eventKey = useRef("");
  return (
    <details>
      <summary>Tạo phiếu kiểm kê</summary>
      <form
        className="form"
        aria-label="Tạo phiếu kiểm kê"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          eventKey.current ||= crypto.randomUUID();
          try {
            const r = await fetch("/api/admin/stocktakes/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventKey: eventKey.current,
                reason,
                lines,
              }),
            });
            const d = await r.json();
            if (!r.ok) {
              eventKey.current = "";
              throw Error(d.error);
            }
            window.location.reload();
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {lines.map((l, index) => (
          <fieldset key={index}>
            <legend>SKU {index + 1}</legend>
            {(["sku", "countedStock", "damagedStock"] as const).map((key) => (
              <label key={key}>
                {key === "sku"
                  ? "SKU kiểm kê"
                  : key === "countedStock"
                    ? "Tồn bán được thực tế"
                    : "Hàng hỏng cách ly"}
                <input
                  required
                  type={key === "sku" ? "text" : "number"}
                  min={0}
                  max={100000}
                  value={l[key]}
                  onChange={(e) => {
                    setLines(
                      lines.map((row, i) =>
                        i === index
                          ? {
                              ...row,
                              [key]:
                                key === "sku"
                                  ? e.target.value
                                  : Number(e.target.value),
                            }
                          : row,
                      ),
                    );
                    eventKey.current = "";
                  }}
                />
              </label>
            ))}
          </fieldset>
        ))}
        <button
          className="button outline"
          type="button"
          onClick={() =>
            setLines([...lines, { sku: "", countedStock: 0, damagedStock: 0 }])
          }
          disabled={lines.length >= 100}
        >
          Thêm SKU kiểm kê
        </button>
        <label>
          Lý do kiểm kê
          <textarea
            aria-label="Lý do kiểm kê"
            required
            minLength={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              eventKey.current = "";
            }}
          />
        </label>
        <button className="button" disabled={busy}>
          Lưu phiếu nháp
        </button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
