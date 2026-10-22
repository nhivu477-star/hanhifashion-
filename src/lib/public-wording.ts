/** Presentation only. Internal ledger states and provenance are retained unchanged. */
export function publicWording(value: string) {
  return value
    .replace(/SIMULATED REFUND/gi, "Hoàn tiền")
    .replace(/SIMULATED_COMPLETED/g, "Đã hoàn tất")
    .replace(/\b(?:demo|mock|simulated)\b/gi, "")
    .replace(/mô phỏng|thử nghiệm/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
export const refundStatusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELED: "Đã hủy",
  SIMULATED_COMPLETED: "Đã hoàn tất",
};
