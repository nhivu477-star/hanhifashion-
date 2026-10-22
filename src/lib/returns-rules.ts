export const returnLabels: Record<string, string> = {
  REQUESTED: "Chờ xem xét",
  UNDER_REVIEW: "Đang xem xét",
  APPROVED: "Đã duyệt, chờ nhận hàng",
  REJECTED: "Đã từ chối",
  RECEIVED: "Đã nhận, chờ kiểm hàng",
  INSPECTED: "Đã kiểm hàng",
  INSPECTION_FAILED: "Kiểm hàng không đạt",
  EXCHANGE_PENDING: "Đang xử lý đổi hàng",
  REFUND_PENDING: "Đang xử lý hoàn",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
};
export const returnTransitions: Record<string, string[]> = {
  REQUESTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED"],
  RECEIVED: ["INSPECTED", "INSPECTION_FAILED"],
  INSPECTED: ["EXCHANGE_PENDING", "REFUND_PENDING"],
  INSPECTION_FAILED: ["CLOSED"],
  EXCHANGE_PENDING: ["COMPLETED", "CLOSED"],
  REFUND_PENDING: ["COMPLETED", "CLOSED"],
  REJECTED: [],
  COMPLETED: [],
  CLOSED: [],
};
export function validateReturnTransition(from: string, to: string) {
  if (!returnTransitions[from]?.includes(to))
    throw Error("Chuyển trạng thái đổi trả không hợp lệ.");
}
export const dispositionLabels: Record<string, string> = {
  SELLABLE: "Được bán lại",
  DAMAGED: "Lỗi/hư hỏng — cách ly",
  REJECTED: "Không chấp nhận trả",
  REVIEW: "Cần kiểm tra thêm",
};
export const POLICY_VERSION = "DEFECT_72H_V1_2026-10-18";
export function returnDeadline(deliveredAt: Date) {
  return new Date(deliveredAt.getTime() + 72 * 3600000);
}
export function inReturnWindow(deliveredAt: Date, now = new Date()) {
  return now >= deliveredAt && now <= returnDeadline(deliveredAt);
}
/** Deterministic largest-remainder VND allocation; never use current catalogue prices. */
export function netLineAmounts(
  items: { id: string; unitPrice: number; quantity: number }[],
  discount: number,
) {
  if (
    new Set(items.map((i) => i.id)).size !== items.length ||
    items.some(
      (i) =>
        !Number.isSafeInteger(i.unitPrice) ||
        i.unitPrice < 0 ||
        !Number.isSafeInteger(i.quantity) ||
        i.quantity < 0,
    )
  )
    throw Error("Dòng tiền hàng không hợp lệ.");
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const gross = sorted.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  if (
    !Number.isSafeInteger(gross) ||
    gross <= 0 ||
    !Number.isSafeInteger(discount) ||
    discount < 0 ||
    discount > gross
  )
    throw Error("Giá trị giảm giá không hợp lệ.");
  const shares = sorted.map((i) => {
    const n = BigInt(i.unitPrice * i.quantity) * BigInt(discount);
    return {
      id: i.id,
      gross: i.unitPrice * i.quantity,
      d: Number(n / BigInt(gross)),
      r: n % BigInt(gross),
    };
  });
  let left = discount - shares.reduce((s, i) => s + i.d, 0);
  for (const i of [...shares].sort((a, b) =>
    a.r === b.r ? a.id.localeCompare(b.id) : a.r > b.r ? -1 : 1,
  )) {
    if (left-- <= 0) break;
    i.d++;
  }
  return Object.fromEntries(shares.map((i) => [i.id, i.gross - i.d]));
}
