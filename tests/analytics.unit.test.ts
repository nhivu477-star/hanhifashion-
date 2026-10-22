import { describe, it, expect } from "vitest";
import {
  reportFilter,
  conversionRate,
  campaignTag,
  csvCell,
  csvRows,
} from "../src/lib/analytics-rules";
import { analyticsPermission } from "../src/lib/analytics-access";
import { can } from "../src/lib/rbac";
describe("Phase6 pure rules", () => {
  const now = new Date("2026-10-19T18:00:00Z");
  it("today uses Vietnam midnight", () =>
    expect(reportFilter({ period: "today" }, now).from.toISOString()).toBe(
      "2026-10-19T17:00:00.000Z",
    ));
  it("last7 exactly seven inclusive days", () => {
    const f = reportFilter({ period: "7" }, now);
    expect(f.to.getTime() - f.from.getTime()).toBe(7 * 86400000);
  });
  it("month starts local day1", () =>
    expect(reportFilter({ period: "month" }, now).fromDay).toBe("2026-10-01"));
  it("reject invalid date", () =>
    expect(() =>
      reportFilter({ period: "custom", from: "2026-02-30" }),
    ).toThrow());
  it("reject reversed interval", () =>
    expect(() =>
      reportFilter({ period: "custom", from: "2026-10-20", to: "2026-10-19" }),
    ).toThrow());
  it("bounds maximum interval", () =>
    expect(() =>
      reportFilter({ period: "custom", from: "2020-01-01", to: "2026-10-19" }),
    ).toThrow());
  it("missing denominator is unknown", () =>
    expect(conversionRate(0, 0)).toBeNull());
  it("rounds rates", () => expect(conversionRate(1, 3)).toBe(33.33));
  it("campaign does not contain email", () =>
    expect(campaignTag.safeParse("x@example.com").success).toBe(false));
  it("campaign does not contain phone", () =>
    expect(campaignTag.safeParse("0901234567").success).toBe(false));
  it("campaign supports Vietnamese names", () =>
    expect(campaignTag.parse("Mùa thu")).toBe("Mùa thu"));
  it("CSV handles formulas", () =>
    expect(csvCell(" =HYPERLINK(1)")).toContain("' ="));
  it("negative numeric CSV remains numeric", () =>
    expect(csvCell(-5000)).toBe('"-5000"'));
  it("CSV escapes quotes", () => expect(csvCell('a"b')).toBe('"a""b"'));
  it("CSV includes BOM", () =>
    expect(csvRows([{ x: 1 }]).startsWith("\uFEFF")).toBe(true));
  it("marketing cannot access finance", () =>
    expect(can("MARKETING_STAFF", analyticsPermission.finance)).toBe(false));
  it("inventory only relevant reports", () => {
    expect(can("INVENTORY_STAFF", analyticsPermission.inventory)).toBe(true);
    expect(can("INVENTORY_STAFF", analyticsPermission.profit)).toBe(false);
  });
});
