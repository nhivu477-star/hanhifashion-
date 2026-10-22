import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { LocalizedContent } from "./localization";
import { reportFilter } from "@/lib/analytics-rules";
import { KpiIcon } from "./kpi-icon";
export async function OperationalKpis({
  page,
  role,
}: {
  page: string;
  role: string;
}) {
  const f = reportFilter({});
  const period = { gte: f.from, lt: f.to };
  const previous = {
    gte: new Date(f.from.getTime() - (f.to.getTime() - f.from.getTime())),
    lt: f.from,
  };
  let cards: {
    label: string;
    value: number;
    before: number | null;
  }[] = [];
  if (page === "don-hang" && can(role, "orders.read")) {
    const month = reportFilter({ period: "month" });
    const groups = await db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: month.from, lt: month.to } },
      _count: { _all: true },
    });
    const count = (statuses?: string[]) =>
      groups
        .filter((g) => !statuses || statuses.includes(g.status))
        .reduce((sum, g) => sum + g._count._all, 0);
    cards = [
      {
        label: "Tổng đơn của tháng",
        value: count(),
        before: null,
      },
      {
        label: "Đơn hoàn tất",
        value: count(["DELIVERED", "COMPLETED"]),
        before: null,
      },
      {
        label: "Chờ xử lý",
        value: count(["PENDING"]),
        before: null,
      },
      {
        label: "Đơn hoàn/hủy",
        value: count(["RETURNED", "CANCELLED"]),
        before: null,
      },
    ];
  } else if (page === "khach-hang" && can(role, "customers.read")) {
    const [now, prior] = await Promise.all([
      db.order.groupBy({
        by: ["userId"],
        where: { userId: { not: null }, createdAt: period },
      }),
      db.order.groupBy({
        by: ["userId"],
        where: { userId: { not: null }, createdAt: previous },
      }),
    ]);
    cards = [
      {
        label: "Khách hàng",
        value: now.length,
        before: prior.length,
      },
    ];
  } else if (
    page === "san-pham" &&
    (can(role, "inventory.read") || can(role, "analytics.inventory.read"))
  ) {
    cards = [
      {
        label: "Sản phẩm sắp hết",
        value: await db.product.count({
          where: { active: true, variants: { some: { stock: { lt: 5 } } } },
        }),
        before: null,
      },
    ];
  }
  if (!cards.length) return null;
  return (
    <LocalizedContent>
      <section
        className={
          "operational-kpis" + (page === "don-hang" ? " order-month-kpis" : "")
        }
        aria-label="Chỉ số vận hành"
      >
        {page === "don-hang" && (
          <div className="order-month-label">
            Tháng {f.toDay.slice(5, 7)}/{f.toDay.slice(0, 4)}
          </div>
        )}
        <div className="dashboard-kpis">
          {cards.map((c, index) => {
            const difference = c.before === null ? null : c.value - c.before;
            return (
              <article
                className={
                  "dashboard-card kpi-card" +
                  (page === "don-hang"
                    ? " order-stat order-stat-" + index
                    : "")
                }
                key={c.label}
              >
                <div className="kpi-top">
                  <span>{c.label}</span>
                  <KpiIcon label={c.label} />
                </div>
                <strong>{c.value.toLocaleString("vi-VN")}</strong>
                {page !== "don-hang" && difference !== null && (
                  <small>
                    {difference > 0 ? "+" : ""}
                    {difference}
                  </small>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </LocalizedContent>
  );
}
