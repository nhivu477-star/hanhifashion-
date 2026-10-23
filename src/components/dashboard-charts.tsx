"use client";
import { useEffect, useRef, useId, useState } from "react";
import { LocalizedContent } from "./localization";
import {
  chartAxis,
  chartDate,
  chartMoney,
  chartTicks,
  revenuePath,
} from "@/lib/dashboard-chart-format";
import type { Row } from "@/lib/analytics-report";
const groups = [
  { label: "Đã giao", codes: ["DELIVERED", "COMPLETED"], color: "#10A66A" },
  {
    label: "Đang xử lý",
    codes: ["CONFIRMED", "PROCESSING", "PACKING", "PACKED"],
    color: "#2F80ED",
  },
  { label: "Đang giao", codes: ["SHIPPING", "SHIPPED"], color: "#FFA11A" },
  { label: "Đã hủy", codes: ["CANCELLED"], color: "#FF4757" },
  { label: "Chờ xử lý", codes: ["PENDING"], color: "#9557F5" },
];
export function DashboardCharts({
  rows,
  statuses,
  from,
  to,
  statusDays,
}: {
  rows: Row[];
  statuses: { name: string; value: number }[];
  from: string;
  to: string;
  statusDays?: { day: string; name: string; value: number }[];
}) {
  const [monthly, setMonthly] = useState(false),
    [active, setActive] = useState<number | null>(null),
    [status, setStatus] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState(to);
  const dailyStatuses = statusDays
    ? statusDays.filter((s) => s.day === selectedDay)
    : statuses;
  const gradient = useId().replaceAll(":", "");
  const plot = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(750);
  useEffect(() => {
    if (!plot.current) return;
    const observer = new ResizeObserver((entries) =>
      setChartWidth(Math.max(320, Math.min(750, entries[0].contentRect.width))),
    );
    observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const plotSpan = chartWidth - 100;

  const dates = new Map<string, number>();
  const endDate = new Date(to + "T00:00:00Z");
  for (
    let d = new Date(from + "T00:00:00Z");
    d <= endDate;
    d = new Date(d.getTime() + 86400000)
  )
    dates.set(d.toISOString().slice(0, monthly ? 7 : 10), 0);
  for (const r of rows) {
    const key = String(r.name).slice(0, monthly ? 7 : 10);
    dates.set(key, (dates.get(key) ?? 0) + Number(r.value ?? 0));
  }
  const data = [...dates].sort(([a], [b]) => a.localeCompare(b));
  const axis = chartAxis(data.map(([, value]) => value));
  const point = (i: number) => [
    64 + (i * plotSpan) / Math.max(1, data.length - 1),
    220 - ((data[i][1] - axis.min) / (axis.max - axis.min)) * 170,
  ];
  const curve = revenuePath(data.map((_, i) => point(i)));
  const ticks = chartTicks(
    data.map(([day]) => day),
    monthly,
    plotSpan,
  );
  const slices = groups.map((g) => ({
    ...g,
    value: dailyStatuses
      .filter((s) => g.codes.includes(s.name))
      .reduce((sum, s) => sum + s.value, 0),
  }));
  const other = dailyStatuses
    .filter((s) => !groups.some((g) => g.codes.includes(s.name)))
    .reduce((sum, s) => sum + s.value, 0);
  if (other)
    slices.push({
      label: "Trạng thái khác",
      codes: [],
      color: "#64748B",
      value: other,
    });
  const total = slices.reduce((s, v) => s + v.value, 0);
  let offset = 0;
  return (
    <LocalizedContent>
      <div className="dashboard-charts">
        <section className="dashboard-card revenue-card">
          <div className="chart-heading">
            <div>
              <h2>Doanh thu</h2>
              <p>Doanh số hàng ròng · VND</p>
            </div>
            <div className="chart-switch">
              <button
                aria-pressed={!monthly}
                onClick={() => {
                  setMonthly(false);
                  setActive(null);
                }}
              >
                Theo ngày
              </button>
              <button
                aria-pressed={monthly}
                onClick={() => {
                  setMonthly(true);
                  setActive(null);
                }}
              >
                Theo tháng
              </button>
            </div>
          </div>
          <div className="revenue-plot" ref={plot}>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartWidth < 500 ? 310 : 285}`}
              aria-label="Biểu đồ doanh thu"
              onPointerMove={(e) => {
                const bounds = e.currentTarget.getBoundingClientRect();
                const x =
                  ((e.clientX - bounds.left) / bounds.width) * chartWidth;
                setActive(
                  Math.max(
                    0,
                    Math.min(
                      data.length - 1,
                      Math.round(
                        ((x - 64) / plotSpan) * Math.max(1, data.length - 1),
                      ),
                    ),
                  ),
                );
              }}
              onPointerDown={(e) => {
                const bounds = e.currentTarget.getBoundingClientRect();
                const x =
                  ((e.clientX - bounds.left) / bounds.width) * chartWidth;
                setActive(
                  Math.max(
                    0,
                    Math.min(
                      data.length - 1,
                      Math.round(
                        ((x - 64) / plotSpan) * Math.max(1, data.length - 1),
                      ),
                    ),
                  ),
                );
              }}
              role="group"
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1677FF" stopOpacity=".24" />
                  <stop offset="100%" stopColor="#1677FF" stopOpacity=".01" />
                </linearGradient>
              </defs>
              <text x="64" y="26" fill="#6B7280" fontSize="11">
                {axis.unitLabel}
              </text>
              {axis.ticks.map((value) => {
                const y =
                  220 - ((value - axis.min) / (axis.max - axis.min)) * 170;
                return (
                  <g key={value}>
                    <line
                      x1="64"
                      x2={chartWidth - 36}
                      y1={y}
                      y2={y}
                      stroke="#EEF0F3"
                    />
                    <text
                      x="54"
                      y={y + 4}
                      textAnchor="end"
                      fill="#6B7280"
                      fontSize="11"
                    >
                      {new Intl.NumberFormat("vi-VN", {
                        maximumFractionDigits: 1,
                      }).format(value / axis.unit)}
                    </text>
                  </g>
                );
              })}
              {data.length > 0 && (
                <>
                  <path
                    d={`${curve} L ${point(data.length - 1)[0]},220 L 64,220 Z`}
                    fill={`url(#${gradient})`}
                  />
                  <path
                    className="revenue-line"
                    d={curve}
                    fill="none"
                    stroke="#1677FF"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {active !== null && data[active] && (
                    <line
                      x1={point(active)[0]}
                      x2={point(active)[0]}
                      y1="45"
                      y2="220"
                      stroke="#1677FF"
                      strokeOpacity=".3"
                      strokeDasharray="4 4"
                    />
                  )}
                  {data.map(([day, value], i) => {
                    const [x, y] = point(i);
                    return (
                      <g key={day}>
                        <circle
                          cx={x}
                          cy={y}
                          r={active === i ? 6 : 3}
                          fill="#1677FF"
                          stroke="white"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx={x}
                          cy={y}
                          r="10"
                          fill="transparent"
                          tabIndex={0}
                          role="button"
                          aria-label={`${chartDate(day, monthly)}: ${chartMoney(value)}`}
                          onMouseEnter={() => setActive(i)}
                          onFocus={() => setActive(i)}
                          onClick={() => setActive(i)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setActive(i);
                            }
                          }}
                        />
                      </g>
                    );
                  })}
                  {ticks.map(({ day, index }) => {
                    const x = point(index)[0],
                      full = chartDate(day, monthly),
                      label = monthly
                        ? full
                        : index === 0 || index === data.length - 1
                          ? full
                          : full.slice(0, 5);
                    return (
                      <text
                        className="revenue-date-tick"
                        key={day}
                        x={x}
                        y="247"
                        transform={
                          chartWidth < 500 ? `rotate(-45 ${x} 247)` : undefined
                        }
                        textAnchor={
                          chartWidth < 500
                            ? "end"
                            : index === 0
                              ? "start"
                              : index === data.length - 1
                                ? "end"
                                : "middle"
                        }
                        fill="#6B7280"
                        fontSize="11"
                      >
                        {label}
                      </text>
                    );
                  })}
                </>
              )}
            </svg>
            {active !== null && data[active] && (
              <output
                className="chart-tooltip"
                role="status"
                data-localize="off"
              >
                <span>{chartDate(data[active][0], monthly)}</span>
                <strong>{chartMoney(data[active][1])}</strong>
              </output>
            )}
          </div>
        </section>
        <section className="dashboard-card status-card">
          <h2>Trạng thái đơn hàng</h2>
          <label className="status-day">
            Ngày
            <input
              aria-label="Ngày trạng thái đơn hàng"
              type="date"
              min={from}
              max={to}
              value={selectedDay}
              onChange={(e) => {
                if (e.target.value >= from && e.target.value <= to) {
                  setSelectedDay(e.target.value);
                  setStatus(null);
                }
              }}
            />
          </label>
          <div className="donut-wrap">
            <svg
              viewBox="0 0 220 220"
              role="group"
              aria-label="Phân bổ trạng thái đơn hàng"
            >
              <circle
                cx="110"
                cy="110"
                r="80"
                fill="none"
                stroke="#F3F4F6"
                strokeWidth="22"
              />
              {slices.map((s, i) => {
                const start = offset;
                offset += (s.value / Math.max(1, total)) * 100;
                return (
                  <circle
                    key={s.label}
                    cx="110"
                    cy="110"
                    r="80"
                    fill="none"
                    stroke={s.color}
                    strokeWidth={status === i ? 26 : 22}
                    pathLength="100"
                    strokeDasharray={`${(s.value / Math.max(1, total)) * 100} 100`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 110 110)"
                    tabIndex={s.value ? 0 : undefined}
                    role="button"
                    aria-label={`${s.label}: ${s.value} (${total ? ((s.value / total) * 100).toFixed(1) : 0}%)`}
                    onMouseEnter={() => setStatus(i)}
                    onFocus={() => setStatus(i)}
                    onClick={() => setStatus(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setStatus(i);
                      }
                    }}
                  />
                );
              })}
              <text
                x="110"
                y="108"
                textAnchor="middle"
                fontSize="32"
                fontWeight="600"
                fill="#111827"
              >
                {total.toLocaleString("vi-VN")}
              </text>
              <text
                x="110"
                y="132"
                textAnchor="middle"
                fontSize="12"
                fill="#6B7280"
              >
                Tổng đơn hàng
              </text>
            </svg>
          </div>
          <div className="status-legend">
            {slices.map((s, i) => (
              <button
                key={s.label}
                onMouseEnter={() => setStatus(i)}
                onFocus={() => setStatus(i)}
                onClick={() => setStatus(i)}
              >
                <i style={{ background: s.color }} />
                {s.label}
              </button>
            ))}
          </div>
          <output className="status-detail" role="status">
            {status !== null
              ? `${slices[status].label}: ${slices[status].value} · ${total ? ((slices[status].value / total) * 100).toFixed(1) : 0}%`
              : "Chạm vào trạng thái để xem chi tiết"}
          </output>
        </section>
      </div>
    </LocalizedContent>
  );
}
