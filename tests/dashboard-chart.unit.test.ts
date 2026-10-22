import { describe, it, expect } from "vitest";
import {
  chartDate,
  chartMoney,
  chartTicks,
  chartAxis,
  revenuePath,
} from "../src/lib/dashboard-chart-format";
describe("dashboard chart presentation", () => {
  it("formats Vietnamese dates and unambiguous money", () => {
    expect(chartDate("2026-10-07")).toBe("07/10/2026");
    expect(chartDate("2026-10", true)).toBe("10/2026");
    expect(chartMoney(10690000)).toBe("10.690.000 ₫");
  });
  it("uses five-day calendar ticks and selected endpoints across months", () => {
    const days = Array.from({ length: 30 }, (_, i) =>
      new Date(Date.UTC(2026, 8, 20 + i)).toISOString().slice(0, 10),
    );
    expect(chartTicks(days).map((t) => t.day)).toEqual([
      "2026-09-20",
      "2026-09-25",
      "2026-09-30",
      "2026-10-05",
      "2026-10-10",
      "2026-10-15",
      "2026-10-19",
    ]);
  });
  it("rounds the monetary axis to legible equal steps and handles zero or negative revenue", () => {
    expect(chartAxis([34100000]).ticks).toEqual([
      0, 10000000, 20000000, 30000000, 40000000,
    ]);
    expect(chartAxis([0]).max).toBeGreaterThan(0);
    expect(chartAxis([-500, 1200]).min).toBeLessThanOrEqual(-500);
  });
  it("keeps monotone curves through the samples and zero plateaus flat", () => {
    expect(revenuePath([])).toBe("");
    const p = revenuePath([
      [0, 10],
      [10, 0],
      [20, 0],
      [30, 10],
    ]);
    expect(p).toContain("20,0");
    expect(p).toContain("30,10");
    expect(p).not.toContain("NaN");
    const commands = p.split(" C ");
    expect(commands[2]).toMatch(/^[\d.]+,0 [\d.]+,0 20,0$/);
  });
});
