import { catalogPriceBounds } from "../src/lib/catalog-filter-rules";
import { describe, it, expect } from "vitest";
import { calculateTotals } from "../src/lib/catalog";
import { requestFingerprint } from "../src/lib/mutation-receipt";
import {
  promotionDate,
  promotionInput,
  validPromotion,
} from "../src/lib/promotions";
import { netLineAmounts } from "../src/lib/returns-rules";
import { storeSettingsInput } from "../src/lib/store-settings";
import { partialCancellationInput } from "../src/lib/partial-cancellation";
import { excelExport } from "../src/lib/analytics-excel";
import ExcelJS from "exceljs";

describe("Business acceptance boundaries", () => {
  it.each([-1, NaN, Infinity, 1.1, 2147483648])(
    "rejects invalid VND subtotal %s",
    (value) => expect(() => calculateTotals(value)).toThrow(),
  );
  it("rejects corrupt promotion type/percentage", () => {
    expect(() =>
      calculateTotals(100, {
        type: "OTHER",
        value: 10,
        minimum: 0,
        maximum: null,
      }),
    ).toThrow();
    expect(() =>
      calculateTotals(100, {
        type: "PERCENT",
        value: 101,
        minimum: 0,
        maximum: null,
      }),
    ).toThrow();
  });
  it("fingerprints are canonical and payload-sensitive", () => {
    expect(requestFingerprint({ b: 2, a: [1] })).toBe(
      requestFingerprint({ a: [1], b: 2 }),
    );
    expect(requestFingerprint({ q: 1 })).not.toBe(requestFingerprint({ q: 2 }));
  });
  it("uses inclusive Vietnam end-of-day for date-only promotion expiry", () => {
    expect(promotionDate("2026-10-19", true)?.toISOString()).toBe(
      "2026-10-19T16:59:59.999Z",
    );
    expect(promotionDate("2026-10-19T09:30")?.toISOString()).toBe(
      "2026-10-19T02:30:00.000Z",
    );
  });
  it.each(["2026-02-30", "not-a-date", "2026-13-01"])(
    "rejects invalid calendar %s",
    (date) => expect(() => promotionDate(date)).toThrow(),
  );
  it("enforces promotion start, expiry, exhaustion and minimum", () => {
    const c = {
      active: true,
      startsAt: new Date("2026-10-19T00:00:00Z"),
      expiresAt: new Date("2026-10-20T00:00:00Z"),
      used: 0,
      usageLimit: 1,
      minimum: 100,
    };
    expect(validPromotion(c, 100, c.startsAt)).toBe(true);
    expect(validPromotion(c, 100, c.expiresAt)).toBe(true);
    expect(validPromotion(c, 100, new Date(c.startsAt.getTime() - 1))).toBe(
      false,
    );
    expect(validPromotion(c, 100, new Date(c.expiresAt.getTime() + 1))).toBe(
      false,
    );
    expect(validPromotion({ ...c, used: 1 }, 100, c.startsAt)).toBe(false);
    expect(validPromotion(c, 99, c.startsAt)).toBe(false);
    expect(validPromotion({ ...c, active: false }, 100, c.startsAt)).toBe(
      false,
    );
  });
  it("rejects inverted promotion range", () =>
    expect(() =>
      promotionInput.parse({
        code: "OK",
        type: "FIXED",
        value: 1,
        minimum: 0,
        startsAt: "2026-10-20",
        expiresAt: "2026-10-19",
        usageLimit: 1,
        active: true,
      }),
    ).toThrow());
  it("validates all settings before any persistence", () =>
    expect(() =>
      storeSettingsInput.parse({
        announcement: "valid",
        contactEmail: "invalid",
      }),
    ).toThrow());
  it("rejects duplicate or fractional cancellation lines", () => {
    const b = {
      id: "o",
      eventKey: crypto.randomUUID(),
      reason: "test",
      items: [
        { id: "a", quantity: 1 },
        { id: "a", quantity: 1 },
      ],
    };
    expect(() => partialCancellationInput.parse(b)).toThrow();
    expect(() =>
      partialCancellationInput.parse({
        ...b,
        items: [{ id: "a", quantity: 0.5 }],
      }),
    ).toThrow();
  });
  it("allocation preserves every VND across varied discounts", () => {
    for (let d = 0; d <= 303; d++) {
      const result = netLineAmounts(
        [
          { id: "b", quantity: 2, unitPrice: 101 },
          { id: "a", quantity: 1, unitPrice: 101 },
        ],
        d,
      );
      expect(Object.values(result).reduce((s, n) => s + n, 0)).toBe(303 - d);
      expect(
        Object.values(result).every((n) => Number.isInteger(n) && n >= 0),
      ).toBe(true);
    }
  });
  it("rejects invalid financial lines", () => {
    expect(() =>
      netLineAmounts([{ id: "a", unitPrice: 1, quantity: -1 }], 0),
    ).toThrow();
    expect(() =>
      netLineAmounts(
        [
          { id: "a", unitPrice: 1, quantity: 1 },
          { id: "a", unitPrice: 1, quantity: 1 },
        ],
        0,
      ),
    ).toThrow();
  });
  it("writes real Excel preserving numeric cells and inert formula-like strings", async () => {
    const stream = excelExport(async () => ({
      rows: [{ name: '=HYPERLINK("bad")', value: 1234567, day: "2026-10-19" }],
      count: 1,
    }));
    const bytes = Buffer.from(await new Response(stream).arrayBuffer());
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
    const row = workbook.worksheets[0].getRow(2);
    expect(row.getCell(1).value).toBe('=HYPERLINK("bad")');
    expect(row.getCell(2).value).toBe(1234567);
    expect(row.getCell(3).value).toBeInstanceOf(Date);
  });
});

describe("Catalog price range acceptance", () => {
  it.each([
    { min: "20", max: "10" },
    { min: "-1" },
    { max: "bad" },
    { min: "1.5" },
    { max: "2147483648" },
  ])("rejects invalid bounds %s", (input) =>
    expect(catalogPriceBounds(input).error).toBeTruthy(),
  );
  it("zero maximum is a real bound, not an omitted value", () =>
    expect(catalogPriceBounds({ max: "0" })).toEqual({
      min: 0,
      max: 0,
      error: null,
    }));
});
