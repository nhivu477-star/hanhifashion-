export const shipmentTransitions: Record<string, string[]> = {
  PENDING: ["READY_FOR_PICKUP", "CANCELED"],
  READY_FOR_PICKUP: ["PICKED_UP", "CANCELED"],
  PICKED_UP: ["IN_TRANSIT", "RETURNING"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERY_FAILED", "RETURNING"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["OUT_FOR_DELIVERY", "RETURNING"],
  RETURNING: ["RETURNED"],
  RETURNED: [],
  DELIVERED: [],
  CANCELED: [],
};
export const shipmentLabels: Record<string, string> = {
  PENDING: "Chờ chuẩn bị kiện",
  READY_FOR_PICKUP: "Sẵn sàng bàn giao",
  PICKED_UP: "Đã bàn giao",
  IN_TRANSIT: "Đang vận chuyển",
  OUT_FOR_DELIVERY: "Đang giao đến khách",
  DELIVERED: "Đã giao",
  DELIVERY_FAILED: "Giao không thành công",
  RETURNING: "Đang chuyển về",
  RETURNED: "Đã về cửa hàng",
  CANCELED: "Đã hủy kiện",
};
export const settlementLabels: Record<string, string> = {
  PENDING: "Chưa thu COD",
  COLLECTED: "Đã thu từ khách",
  PARTIALLY_REMITTED: "Đã chuyển một phần",
  REMITTED: "Đã chuyển đủ, chờ đối soát",
  RECONCILED: "Đã đối soát",
  DISPUTED: "Cần điều tra chênh lệch",
};
export const failureLabels: Record<string, string> = {
  RECIPIENT_UNAVAILABLE: "Không liên hệ được người nhận",
  RECIPIENT_REFUSED: "Người nhận từ chối",
  INVALID_ADDRESS: "Địa chỉ không hợp lệ",
  UNSUCCESSFUL: "Giao không thành công",
};
export function validateShipmentTransition(from: string, to: string) {
  if (!shipmentTransitions[from]?.includes(to))
    throw new Error("Chuyển trạng thái kiện không hợp lệ.");
}
export function settlementTotals(
  expected: number,
  collected: number,
  remitted: number,
  hasCollection: boolean,
) {
  const discrepancy =
    (hasCollection && collected !== expected) || remitted > collected;
  return {
    outstanding: Math.max(0, collected - remitted),
    customerOutstanding: Math.max(0, expected - collected),
    discrepancy,
    status: discrepancy
      ? "DISPUTED"
      : remitted > 0
        ? remitted === collected
          ? "REMITTED"
          : "PARTIALLY_REMITTED"
        : hasCollection
          ? "COLLECTED"
          : "PENDING",
  };
}
