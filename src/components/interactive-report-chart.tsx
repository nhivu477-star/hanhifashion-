"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import type { Row } from "@/lib/analytics-report";
export function InteractiveReportChart({ rows }: { rows: Row[] }) {
  const [metric, setMetric] = useState("value"),
    [active, setActive] = useState<number | null>(null);
  const choices = ["value", "orders", "units"].filter((k) =>
    rows.some((r) => typeof r[k] === "number"),
  );
  const key = choices.includes(metric) ? metric : (choices[0] ?? "value");
  const values = rows.map((r) => Number(r[key] ?? 0)),
    max = Math.max(1, ...values.map(Math.abs));
  const point = (i: number) => [
    30 + (i * 640) / Math.max(1, rows.length - 1),
    170 - (values[i] / max) * 140,
  ];
  return (
    <LocalizedContent>
      {
        <figure className="analytics-interactive">
          <figcaption>Xu hướng theo kỳ đã chọn</figcaption>
          <label>
            Chỉ số{" "}
            <select
              value={key}
              onChange={(e) => {
                setMetric(e.target.value);
                setActive(null);
              }}
            >
              {choices.map((k) => (
                <option key={k} value={k}>
                  {
                    {
                      value: "Doanh số ròng",
                      orders: "Số đơn",
                      units: "Số lượng",
                    }[k]
                  }
                </option>
              ))}
            </select>
          </label>
          {!rows.length ? (
            <p>Chưa có dữ liệu trong kỳ.</p>
          ) : (
            <>
              <svg
                viewBox="0 0 700 210"
                role="img"
                aria-label="Biểu đồ tương tác theo ngày"
              >
                <line x1="30" x2="680" y1="170" y2="170" stroke="#aaa" />
                <polyline
                  points={values.map((_, i) => point(i).join(",")).join(" ")}
                  fill="none"
                  stroke="#254c62"
                  strokeWidth="3"
                />
                {rows.map((r, i) => {
                  const [x, y] = point(i);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={active === i ? 7 : 4}
                        fill="#254c62"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r="13"
                        fill="transparent"
                        tabIndex={0}
                        role="button"
                        aria-label={`${r.name}: ${values[i].toLocaleString("vi-VN")}`}
                        onMouseEnter={() => setActive(i)}
                        onFocus={() => setActive(i)}
                        onClick={() => setActive(i)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") setActive(i);
                        }}
                      >
                        <title>{`${r.name}: ${values[i].toLocaleString("vi-VN")}`}</title>
                      </circle>
                    </g>
                  );
                })}
              </svg>
              <output aria-live="polite">
                {active === null
                  ? "Chạm hoặc đưa chuột đến một điểm để xem chi tiết."
                  : `${rows[active].name}: ${values[active].toLocaleString("vi-VN")}${key === "value" ? " đ" : ""}`}
              </output>
            </>
          )}
        </figure>
      }
    </LocalizedContent>
  );
}
