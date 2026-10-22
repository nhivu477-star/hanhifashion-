import { KpiIcon } from "./kpi-icon";
import { dashboardSummary } from "@/lib/dashboard-summary";
import { DashboardCharts } from "./dashboard-charts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LocalizedContent } from "@/components/localization";
import { InteractiveReportChart } from "./interactive-report-chart";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  reportFilter,
  sections,
  AnalyticsSection,
} from "@/lib/analytics-rules";
import { analyticsPermission } from "@/lib/analytics-access";
import { analyticsReport, Row } from "@/lib/analytics-report";
import { can } from "@/lib/rbac";
import { Params, scalar } from "@/lib/queries";
import { CostForm } from "./analytics-cost-form";
import { statusLabels, transitions } from "@/lib/catalog";
const names: Record<AnalyticsSection, string> = {
  overview: "Tổng quan",
  sales: "Doanh số",
  products: "Sản phẩm",
  customers: "Khách hàng",
  funnel: "Phễu chuyển đổi",
  carts: "Giỏ bỏ dở",
  inventory: "Tồn kho",
  profit: "Lợi nhuận",
  marketing: "Nguồn tiếp cận",
  finance: "COD & đối soát",
  reports: "Báo cáo & đối chiếu",
};
const labels: Record<string, string> = {
  name: "Nhóm / mã",
  value: "Giá trị",
  units: "Số lượng",
  orders: "Đơn",
  gross: "Trước giảm",
  verified: "Đã xác minh",
  publication: "Trạng thái",
  catalogPrice: "Giá niêm yết",
  returnedUnits: "SL trả",
  canceledUnits: "SL hủy",
  orderedUnits: "SL đặt",
  product: "Sản phẩm",
  stock: "Tồn",
  price: "Giá",
  sku: "SKU",
  time: "Thời gian",
  reason: "Lý do",
  state: "Tình trạng",
  lastActivity: "Hoạt động cuối",
  unitCost: "Giá vốn",
  cogs: "Vốn hàng",
  grossProfit: "Lãi gộp",
  customers: "Khách",
  sessions: "Phiên",
  checkouts: "Checkout",
  cohortSize: "Cỡ nhóm",
  activityMonth: "Tháng quay lại",
  returnRate: "Tỷ lệ trả %",
  cancellationRate: "Tỷ lệ hủy %",
  aov: "AOV",
  expected: "COD dự kiến",
  collected: "Đã thu",
  remitted: "Chuyển về",
  outstanding: "Còn phải chuyển",
  refunds: "Hoàn",
  reconciliationStatus: "Đối soát",
  shipmentStatus: "Giao hàng",
  stockOrigin: "Nguồn tồn",
  checkoutConversion: "Checkout→đơn %",
  returningCustomers: "Khách quay lại",
};
function Table({ rows }: { rows: Row[] }) {
  if (!rows.length)
    return (
      <LocalizedContent>
        {<p className="empty">Chưa đủ dữ liệu trong bộ lọc hiện tại.</p>}
      </LocalizedContent>
    );
  const keys = Object.keys(rows[0]).filter((k) => k !== "id");
  return (
    <LocalizedContent>
      {
        <div className="analytics-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                {keys.map((k) => (
                  <th key={k}>{labels[k] ?? k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={String(r.id ?? i)}>
                  {keys.map((k) => (
                    <td key={k}>
                      {r[k] === null
                        ? "Chưa có dữ liệu"
                        : typeof r[k] === "number"
                          ? r[k].toLocaleString("vi-VN")
                          : r[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </LocalizedContent>
  );
}
export async function AnalyticsAdmin({
  query,
  role,
  section,
}: {
  query: Params;
  role: string;
  section?: string;
}) {
  const available = sections.filter((s) => can(role, analyticsPermission[s]));
  const reportSurface = section === "reports";
  const requested = reportSurface ? scalar(query.view) || "reports" : section;
  const selected = sections.includes(requested as AnalyticsSection)
    ? (requested as AnalyticsSection)
    : available[0];
  if (!selected || !can(role, analyticsPermission[selected]))
    return (
      <LocalizedContent>
        {<p role="alert">Không có quyền xem báo cáo này.</p>}
      </LocalizedContent>
    );
  const input = {
    ...Object.fromEntries(
      Object.entries(query).map(([k, v]) => [k, scalar(v)]),
    ),
    section: selected,
  };
  let f;
  try {
    f = reportFilter(selected === "overview" ? { section: "overview" } : input);
  } catch {
    return (
      <LocalizedContent>
        {
          <p role="alert">
            Bộ lọc không hợp lệ.{" "}
            <Link href={"/admin/phan-tich/" + selected}>Đặt lại</Link>
          </p>
        }
      </LocalizedContent>
    );
  }
  let report;
  try {
    report = await analyticsReport(f, role);
  } catch (error) {
    console.error("Analytics report failed", error);
    return (
      <LocalizedContent>
        {
          <p role="alert">
            Không thể tải báo cáo.{" "}
            <Link href={"/admin/phan-tich/" + selected}>Thử lại</Link>
          </p>
        }
      </LocalizedContent>
    );
  }
  const dashboard =
    selected === "overview" ? await dashboardSummary(f, role) : null;
  const params = new URLSearchParams(Object.entries(input));
  const href = (page: number) => {
    const p = new URLSearchParams(params);
    p.set("page", String(page));
    return "?" + p;
  };
  const filtered = !["funnel", "carts"].includes(selected);
  const [categories, products] = filtered
    ? await Promise.all([
        db.category.findMany({ select: { id: true, name: true } }),
        db.product.findMany({
          where: { active: true },
          select: { id: true, name: true },
          take: 600,
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];
  return (
    <LocalizedContent>
      {
        <section className="analytics-admin">
          <div className="dashboard-title">
            <div>
              <h1>{selected === "overview" ? "Tổng quan" : names[selected]}</h1>
              <p>Theo dõi hoạt động kinh doanh · Giờ Việt Nam</p>
            </div>
          </div>
          {reportSurface && (
            <>
              <div className="report-kind">
                {" "}
                <label>
                  Loại báo cáo
                  <select
                    aria-label="Loại báo cáo"
                    name="view"
                    form="report-filters"
                    defaultValue={selected}
                  >
                    {available
                      .filter((s) => s !== "overview")
                      .map((s) => (
                        <option key={s} value={s}>
                          {names[s]}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <form
                id="report-filters"
                className="analytics-filters"
                method="get"
              >
                <input type="hidden" name="period" value="custom" />
                <label>
                  Từ ngày
                  <input
                    aria-label="Từ ngày"
                    name="from"
                    type="date"
                    defaultValue={f.fromDay}
                  />
                </label>
                <label>
                  Đến ngày
                  <input
                    aria-label="Đến ngày"
                    name="to"
                    type="date"
                    defaultValue={f.toDay}
                  />
                </label>
                {filtered && (
                  <>
                    <label>
                      Danh mục
                      <select
                        aria-label="Danh mục"
                        name="category"
                        defaultValue={f.category}
                      >
                        <option value="">Tất cả</option>
                        {categories.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Sản phẩm
                      <select
                        aria-label="Sản phẩm"
                        name="product"
                        defaultValue={f.product}
                      >
                        <option value="">Tất cả</option>
                        {products.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Trạng thái đơn
                      <select
                        aria-label="Trạng thái đơn"
                        name="status"
                        defaultValue={f.status}
                      >
                        <option value="">Tất cả</option>
                        {Object.keys(transitions).map((s) => (
                          <option key={s} value={s}>
                            {statusLabels[s] ?? s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tìm tên / SKU
                      <input
                        aria-label="Tìm tên / SKU"
                        name="q"
                        defaultValue={f.q}
                        maxLength={80}
                      />
                    </label>
                  </>
                )}
                {selected === "carts" && (
                  <label>
                    Không hoạt động (giờ)
                    <input
                      aria-label="Không hoạt động (giờ)"
                      name="inactivity"
                      type="number"
                      min={1}
                      max={720}
                      defaultValue={f.inactivity}
                    />
                  </label>
                )}
                <label>
                  Sắp xếp
                  <select
                    aria-label="Sắp xếp"
                    name="sort"
                    defaultValue={f.sort}
                  >
                    <option value="value">Giá trị giảm dần</option>
                    <option value="units">Số lượng giảm dần</option>
                    <option value="name">Tên / ngày tăng dần</option>
                  </select>
                </label>
                <button className="button">Áp dụng</button>
              </form>
            </>
          )}
          {dashboard ? (
            <>
              <div className="dashboard-kpis dashboard-kpis-overview">
                {dashboard.metrics.slice(0, 2).map((m) => {
                  const difference =
                    m.value !== null && m.before !== null
                      ? m.value - m.before
                      : null;
                  const Trend =
                    difference === null || difference === 0
                      ? Minus
                      : difference > 0
                        ? TrendingUp
                        : TrendingDown;
                  return (
                    <article className="dashboard-card kpi-card" key={m.label}>
                      <div className="kpi-top">
                        <span>{m.label}</span>
                        <KpiIcon label={m.label} />
                      </div>
                      <strong>
                        {m.value === null ? (
                          "Không có quyền"
                        ) : (
                          <span data-localize="off">
                            {m.value.toLocaleString("vi-VN") +
                              (m.currency ? "đ" : "")}
                          </span>
                        )}
                      </strong>
                      <small
                        className={
                          difference !== null && difference < 0
                            ? "trend-down"
                            : "trend-up"
                        }
                      >
                        <Trend size={14} />
                        {difference === null ? (
                          "Tồn kho hiện tại · ngưỡng dưới 5"
                        ) : (
                          <span>
                            <span data-localize="off">{`${difference > 0 ? "+" : ""}${difference.toLocaleString("vi-VN")}${m.currency ? "đ" : ""}`}</span>{" "}
                            <span>
                              so với hôm qua
                            </span>
                          </span>
                        )}
                      </small>
                    </article>
                  );
                })}
              </div>
              <DashboardCharts
                rows={report.chart}
                statuses={dashboard.statuses}
                statusDays={dashboard.statusDays}
                from={f.fromDay}
                to={f.toDay}
              />
            </>
          ) : (
            <>
              <div className="admin-metrics">
                {report.metrics.map((m) => (
                  <article key={m.label}>
                    <span>{m.label}</span>
                    <strong>
                      {m.value === null
                        ? "Chưa đủ dữ liệu"
                        : m.value.toLocaleString("vi-VN") +
                          (m.unit === "VND" ? "đ" : (m.unit ?? ""))}
                    </strong>
                  </article>
                ))}
              </div>
              <ul>
                {report.notes
                  .filter((n) => /CẢNH BÁO|thiếu|chưa|không có|lỗi/i.test(n))
                  .map((n) => (
                    <li key={n}>{n}</li>
                  ))}
              </ul>
              <InteractiveReportChart
                rows={report.chart.length ? report.chart : report.rows}
              />
              <h2>Chi tiết ({report.count.toLocaleString("vi-VN")} nhóm)</h2>
              {reportSurface && can(role, "analytics.export") && (
                <div className="report-exports">
                  <h2>Xuất báo cáo theo bộ lọc</h2>
                  {available.map((s) => {
                    const exportParams = new URLSearchParams(params);
                    exportParams.set("section", s);
                    if (["carts", "funnel"].includes(s))
                      for (const key of ["category", "product", "status", "q"])
                        exportParams.delete(key);
                    return (
                      <span key={s} className="report-export-options">
                        <a
                          className="report-link"
                          href={"/api/analytics/export?" + exportParams}
                        >
                          Xuất {names[s]} · CSV
                        </a>{" "}
                        <a
                          className="report-link"
                          href={
                            "/api/analytics/export?" +
                            exportParams +
                            "&format=xlsx"
                          }
                        >
                          Xuất {names[s]} · Excel
                        </a>
                      </span>
                    );
                  })}
                </div>
              )}
              <Table rows={report.rows} />
              <nav className="pagination" aria-label="Phân trang báo cáo">
                {f.page > 1 && <Link href={href(f.page - 1)}>Trang trước</Link>}
                <span>
                  Trang {f.page} / {Math.max(1, Math.ceil(report.count / 24))}
                </span>
                {f.page * 24 < report.count && (
                  <Link href={href(f.page + 1)}>Trang sau</Link>
                )}
              </nav>
              {report.extra.map((e) => (
                <section key={e.title}>
                  <h2>{e.title}</h2>
                  <Table rows={e.rows} />
                </section>
              ))}
            </>
          )}
          {selected === "profit" && can(role, "analytics.costs.manage") && (
            <CostForm />
          )}
        </section>
      }
    </LocalizedContent>
  );
}
