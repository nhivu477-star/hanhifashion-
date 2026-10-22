import { z } from "zod";
export const eventTypes = [
  "SESSION_STARTED",
  "PRODUCT_VIEWED",
  "PRODUCT_SEARCHED",
  "ADD_TO_CART_ATTEMPTED",
  "ADD_TO_CART_SUCCEEDED",
  "CHECKOUT_STARTED",
  "ORDER_PLACED",
] as const;
export const sections = [
  "overview",
  "sales",
  "products",
  "customers",
  "funnel",
  "carts",
  "inventory",
  "profit",
  "marketing",
  "finance",
  "reports",
] as const;
export type AnalyticsSection = (typeof sections)[number];
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s + "T00:00:00+07:00")) &&
      new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s,
    "Ngày chưa hợp lệ",
  );
export function reportFilter(input: Record<string, unknown>, now = new Date()) {
  const today = new Date(now.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  const d = z
    .object({
      section: z.enum(sections).default("overview"),
      period: z.enum(["today", "7", "30", "month", "custom"]).default("30"),
      from: day.optional(),
      to: day.optional(),
      category: z.string().max(80).default(""),
      product: z.string().max(80).default(""),
      status: z.string().max(40).default(""),
      q: z.string().trim().max(80).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      sort: z.enum(["value", "name", "units"]).default("value"),
      inactivity: z.coerce.number().int().min(1).max(720).default(24),
    })
    .parse(input);
  const end = d.period === "custom" ? (d.to ?? today) : today;
  const start =
    d.period === "custom"
      ? (d.from ?? end)
      : d.period === "month"
        ? today.slice(0, 7) + "-01"
        : new Date(
            new Date(today + "T00:00:00+07:00").getTime() -
              (d.period === "today" ? 0 : d.period === "7" ? 6 : 29) *
                86400000 +
              7 * 3600000,
          )
            .toISOString()
            .slice(0, 10);
  const from = new Date(start + "T00:00:00+07:00"),
    to = new Date(new Date(end + "T00:00:00+07:00").getTime() + 86400000);
  if (from >= to || to.getTime() - from.getTime() > 366 * 86400000)
    throw Error("Khoảng báo cáo phải từ 1 đến 366 ngày.");
  return { ...d, from, to, fromDay: start, toDay: end, now };
}
export type ReportFilter = ReturnType<typeof reportFilter>;
// Campaign identifiers only: reject personal contact data and URLs, never persist raw search queries.
export const campaignTag = z
  .string()
  .trim()
  .max(80)
  .regex(/^[\p{L}\p{N} _.-]*$/u)
  .refine(
    (s) => !/[0-9]{7,}/.test(s),
    "Mã chiến dịch không chứa số điện thoại",
  );
export const attributionInput = z
  .object({
    source: campaignTag.default("direct"),
    medium: campaignTag.default(""),
    campaign: campaignTag.default(""),
    content: campaignTag.default(""),
    term: campaignTag.default(""),
  })
  .strict();
export function conversionRate(n: number, d: number) {
  return d ? Math.round((n / d) * 10000) / 100 : null;
}
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value === "number" && Number.isFinite(value)) return '"' + s + '"';
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export function csvRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return "\uFEFFKhông có dữ liệu\r\n";
  const keys = Object.keys(rows[0]);
  return (
    "\uFEFF" +
    [keys, ...rows.map((r) => keys.map((k) => r[k]))]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
