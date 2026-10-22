import { describe, it, expect } from "vitest";
import {
  bodyInput,
  adviseSize,
  sampleChart,
  decodeChart,
  chartSchema,
} from "../src/lib/sizing";
const variants = ["XS", "S", "M", "L", "XL", "XXL"].map((size) => ({
  size,
  stock: 5,
}));
describe("Private deterministic category size advice", () => {
  it("requires only height and weight, supports decimals", () => {
    expect(
      bodyInput.safeParse({
        height: "160.5",
        weight: "50.5",
        bust: "",
        waist: "",
        hips: "",
      }).success,
    ).toBe(true);
    for (const h of ["", 0, -1, "abc"])
      expect(bodyInput.safeParse({ height: h, weight: 50 }).success).toBe(
        false,
      );
    expect(bodyInput.safeParse({ height: 160, weight: "" }).success).toBe(
      false,
    );
    expect(
      bodyInput.safeParse({ height: 160, weight: 50, bust: -1 }).success,
    ).toBe(false);
  });
  it("uses configured matrix without inventing measurements", () => {
    const c = sampleChart("top");
    expect(adviseSize({ height: 160, weight: 51 }, c, variants).sizes).toEqual([
      "M",
    ]);
    expect(adviseSize({ height: 160, weight: 51 }, c, variants)).toEqual(
      adviseSize({ height: 160, weight: 51 }, c, variants),
    );
    expect(adviseSize({ height: 200, weight: 120 }, c, variants).sizes).toEqual(
      [],
    );
  });
  it("does not recommend multiple sizes at matrix boundaries", () => {
    expect(
      adviseSize({ height: 160, weight: 50 }, sampleChart("top"), variants)
        .sizes,
    ).toEqual([]);
  });
  it("uses bust for tops, waist and hips for bottoms", () => {
    expect(
      adviseSize(
        { height: 160, weight: 51, bust: 90 },
        sampleChart("top"),
        variants,
      ).sizes,
    ).toEqual(["L"]);
    expect(
      adviseSize(
        { height: 160, weight: 51, bust: 90, waist: 64, hips: 88 },
        sampleChart("bottom"),
        variants,
      ).sizes,
    ).toEqual(["S"]);
  });
  it("uses a single optional measurement without requiring three", () => {
    expect(
      adviseSize(
        { height: 160, weight: 51, waist: 72 },
        sampleChart("bottom"),
        variants,
      ).sizes,
    ).toEqual(["L"]);
  });
  it("rejects conflicting measurements instead of listing conflicting sizes", () => {
    expect(
      adviseSize(
        { height: 160, weight: 51, bust: 86, waist: 72, hips: 96 },
        sampleChart("dress"),
        variants,
      ).sizes,
    ).toEqual([]);
    expect(
      adviseSize(
        { height: 160, weight: 51, bust: 86, waist: 72, hips: 96 },
        sampleChart("dress"),
        variants,
      ).reason,
    ).toContain("nhắn tin");
  });
  it("keeps best fit out of stock rather than replacing it", () => {
    expect(
      adviseSize(
        { height: 160, weight: 51 },
        sampleChart("top"),
        variants.map((v) => ({ ...v, stock: v.size === "M" ? 0 : 5 })),
      ),
    ).toMatchObject({ sizes: ["M"], available: [] });
  });
  it("only recommends sizes present for the product", () => {
    expect(
      adviseSize({ height: 160, weight: 51 }, sampleChart("top"), [
        { size: "S", stock: 5 },
      ]).sizes,
    ).toEqual([]);
  });
  it("uses validated override/free-size charts and verified stretch only as passed", () => {
    const chart = {
      kind: "knit",
      notes: "Tham khảo",
      rows: [{ size: "Free size", bust: [80, 92] as [number, number] }],
      matrix: [
        {
          size: "Free size",
          height: [150, 175] as [number, number],
          weight: [42, 65] as [number, number],
        },
      ],
    };
    expect(
      adviseSize({ height: 160, weight: 51 }, chart, [
        { size: "Free size", stock: 2 },
      ]).sizes,
    ).toEqual(["Free size"]);
    expect(
      adviseSize(
        { height: 160, weight: 51, bust: 94 },
        chart,
        [{ size: "Free size", stock: 2 }],
        "regular",
        2,
      ).sizes,
    ).toEqual(["Free size"]);
  });
  it("fails safely on missing or corrupt rules", () => {
    expect(
      decodeChart({
        kind: "top",
        notes: "",
        rowsJson: "oops",
        matrixJson: "[]",
      }),
    ).toBe(null);
    expect(
      adviseSize({ height: 160, weight: 51 }, null, variants).sizes,
    ).toEqual([]);
    const c = sampleChart("top");
    c.rows[0].bust = [100, 80];
    expect(chartSchema.safeParse(c).success).toBe(false);
  });
});
