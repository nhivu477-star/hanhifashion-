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
  it.each([220, 650])("keeps daily labels separated within a %ipx plot without losing date boundaries", (plotSpan) => {
    const days = Array.from({ length: 30 }, (_, i) =>
      new Date(Date.UTC(2026, 8, 24 + i)).toISOString().slice(0, 10),
    );
    const ticks = chartTicks(days, false, plotSpan);
    expect(ticks[0].index).toBe(0);
    expect(ticks.at(-1)?.index).toBe(days.length - 1);
    for (let i = 1; i < ticks.length; i++) {
      const gap = ((ticks[i].index - ticks[i - 1].index) * plotSpan) / (days.length - 1);
      expect(gap).toBeGreaterThanOrEqual(90);
    }
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
