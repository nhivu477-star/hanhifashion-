import { z } from "zod";
const required = (message: string, max: number) =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({
        required_error: message,
        invalid_type_error:
          "Thông tin này chưa đúng định dạng, nàng thử kiểm tra lại nhé.",
      })
      .positive("Vui lòng nhập số lớn hơn 0.")
      .max(
        max,
        "Thông tin này nằm ngoài phạm vi hỗ trợ, nàng kiểm tra lại nhé.",
      ),
  );
const optional = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z
    .number({
      invalid_type_error:
        "Thông tin này chưa đúng định dạng, nàng thử kiểm tra lại nhé.",
    })
    .positive("Vui lòng nhập số lớn hơn 0.")
    .max(250)
    .optional(),
);
export const bodyInput = z.object({
  height: required("Vui lòng nhập chiều cao của nàng.", 250),
  weight: required(
    "Vui lòng nhập cân nặng để HÀ NHI có thể gợi ý kích cỡ.",
    300,
  ),
  bust: optional,
  waist: optional,
  hips: optional,
});
export type BodyInput = z.infer<typeof bodyInput>;
export type Range = [number, number];
export type SizeRow = {
  size: string;
  bust?: Range;
  waist?: Range;
  hips?: Range;
  length?: number;
  sleeve?: number;
  shoulder?: number;
  inseam?: number;
  extra?: string;
};
export type MatrixRow = { size: string; height: Range; weight: Range };
export type Chart = {
  kind: string;
  notes: string;
  rows: SizeRow[];
  matrix: MatrixRow[];
};
export const chartSchema = z
  .object({
    kind: z.enum(["top", "bottom", "dress", "set", "knit"]),
    notes: z.string().max(2000),
    rows: z
      .array(
        z.object({
          size: z.enum(["XS", "S", "M", "L", "XL", "XXL", "Free size"]),
          bust: z
            .tuple([z.number().positive(), z.number().positive()])
            .optional(),
          waist: z
            .tuple([z.number().positive(), z.number().positive()])
            .optional(),
          hips: z
            .tuple([z.number().positive(), z.number().positive()])
            .optional(),
          length: z.number().positive().optional(),
          sleeve: z.number().positive().optional(),
          shoulder: z.number().positive().optional(),
          inseam: z.number().positive().optional(),
          extra: z.string().max(300).optional(),
        }),
      )
      .min(1)
      .max(10),
    matrix: z
      .array(
        z.object({
          size: z.string(),
          height: z.tuple([z.number().positive(), z.number().positive()]),
          weight: z.tuple([z.number().positive(), z.number().positive()]),
        }),
      )
      .max(100),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.rows.map((r) => r.size)).size !== c.rows.length)
      ctx.addIssue({
        code: "custom",
        message: "Kích cỡ trong bảng không được trùng.",
      });
    for (const r of [...c.rows, ...c.matrix])
      for (const [k, v] of Object.entries(r))
        if (Array.isArray(v) && v[0] > v[1])
          ctx.addIssue({
            code: "custom",
            message: `Khoảng ${k} phải tăng dần.`,
          });
    if (c.matrix.some((m) => !c.rows.some((r) => r.size === m.size)))
      ctx.addIssue({
        code: "custom",
        message: "Ma trận phải dùng kích cỡ có trong bảng.",
      });
  });
export function decodeChart(record: any): Chart | null {
  if (!record) return null;
  try {
    const parsed = chartSchema.safeParse({
      kind: record.kind,
      notes: record.notes,
      rows: JSON.parse(record.rowsJson),
      matrix: JSON.parse(record.matrixJson),
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function adviseSize(
  input: BodyInput,
  chart: Chart | null,
  variants: { size: string; stock: number }[],
  fit = "regular",
  stretch = 0,
) {
  const insufficient = {
    sizes: [] as string[],
    reason:
      "Số đo hiện tại chưa khớp rõ với một size của mẫu này. Nàng hãy đối chiếu bảng size hoặc nhắn tin để HÀ NHI tư vấn trực tiếp nhé.",
    available: [] as string[],
  };
  if (!chart) return insufficient;
  const rows = chart.rows.filter((r) =>
    variants.some((v) => v.size === r.size),
  );
  const reference = chart.matrix.filter(
    (r) =>
      input.height >= r.height[0] &&
      input.height <= r.height[1] &&
      input.weight >= r.weight[0] &&
      input.weight <= r.weight[1] &&
      rows.some((s) => s.size === r.size),
  );
  const priorities: Record<string, number> =
    chart.kind === "bottom"
      ? { waist: 3, hips: 3 }
      : chart.kind === "top" || chart.kind === "knit"
        ? { bust: 4, waist: 1 }
        : { bust: 3, waist: fit === "slim" ? 4 : 3, hips: 3 };
  const keys = (
    Object.keys(priorities) as ("bust" | "waist" | "hips")[]
  ).filter((k) => input[k] !== undefined && rows.some((r) => r[k]));
  if (!keys.length && !reference.length) return insufficient;
  let sizes: string[] = [];
  if (keys.length) {
    // Reject bodies outside configured chart coverage instead of extrapolating.
    if (
      keys.some(
        (k) =>
          input[k]! <
            Math.min(...rows.filter((r) => r[k]).map((r) => r[k]![0])) - 1 ||
          input[k]! >
            Math.max(...rows.filter((r) => r[k]).map((r) => r[k]![1])) +
              Math.min(3, Math.max(0, stretch)),
      )
    )
      return insufficient;
    const scored = rows
      .map((r) => {
        let score = 0;
        for (const k of keys) {
          const range = r[k];
          if (!range) return { size: r.size, score: Infinity };
          const n = input[k]!;
          const allowance = Math.min(3, Math.max(0, stretch));
          const distance =
            n < range[0]
              ? range[0] - n
              : n > range[1] + allowance
                ? n - range[1] - allowance
                : 0;
          score += distance * priorities[k];
        }
        return { size: r.size, score };
      })
      .sort((a, b) => a.score - b.score);
    const best = scored[0]?.score;
    if (best === undefined || !Number.isFinite(best)) return insufficient;
    sizes = scored.filter((r) => r.score <= best + 1).map((r) => r.size);
    // Conflicting measurements explicitly retain independently best candidates.
    const independent = keys.map((k) =>
      rows
        .filter((r) => r[k] && input[k]! >= r[k]![0] && input[k]! <= r[k]![1])
        .map((r) => r.size),
    );
    const conflict =
      independent.every((a) => a.length) &&
      !rows.some((r) =>
        keys.every(
          (k) => r[k] && input[k]! >= r[k]![0] && input[k]! <= r[k]![1],
        ),
      );
    if (conflict)
      return {
        ...insufficient,
        reason:
          "Các số đo đang lệch nhau giữa nhiều size nên HÀ NHI chưa thể gợi ý chính xác. Nàng hãy đối chiếu bảng size hoặc nhắn tin để được tư vấn trực tiếp nhé.",
      };
  } else sizes = [...new Set(reference.map((r) => r.size))];
  if (sizes.length !== 1)
    return {
      ...insufficient,
      reason:
        "Số đo đang nằm giữa nhiều size nên HÀ NHI chưa thể gợi ý chính xác. Nàng hãy đối chiếu bảng size hoặc nhắn tin để được tư vấn trực tiếp nhé.",
    };
  const available = sizes.filter((s) =>
    variants.some((v) => v.size === s && v.stock > 0),
  );
  const reason =
    sizes.length > 1
      ? `Thông tin hiện tại cho thấy nàng có thể phù hợp với size ${sizes.join(" hoặc ")}. Nàng hãy tham khảo thêm bảng số đo chi tiết để lựa chọn thoải mái nhất nhé.`
      : `Dựa trên ${keys.length ? "số đo" : "chiều cao và cân nặng"} nàng đã chia sẻ, size ${sizes[0]} có thể là lựa chọn phù hợp để tham khảo. Nàng có thể đối chiếu thêm bảng số đo của sản phẩm để lựa chọn thoải mái hơn nhé.`;
  return { sizes, available, reason };
}
export function sampleChart(kind: Chart["kind"], index = 0): Chart {
  const labels = ["XS", "S", "M", "L", "XL", "XXL"];
  return {
    kind,
    notes:
      "Thông số tham khảo của danh mục mẫu, đơn vị cm; khoảng số đo cơ thể, không phải số đo thành phẩm. Chiều cao và cân nặng chỉ hỗ trợ ước lượng. Bộ phối dùng chung một size; đối chiếu cả phần áo và phần dưới. Liên hệ cửa hàng khi cần số đo thành phẩm đã xác nhận.",
    rows: labels.map((size, i) => ({
      size,
      ...(kind !== "bottom" ? { bust: [76 + i * 4, 80 + i * 4] as Range } : {}),
      waist: [58 + i * 4, 62 + i * 4] as Range,
      ...(kind !== "top" && kind !== "knit"
        ? { hips: [82 + i * 4, 86 + i * 4] as Range }
        : {}),
    })),
    matrix: labels.map((size, i) => ({
      size,
      height: [145, 180] as Range,
      weight: [
        38 + i * 6 + (kind === "bottom" ? 2 : 0),
        44 + i * 6 + (kind === "bottom" ? 2 : 0),
      ] as Range,
    })),
  };
}
