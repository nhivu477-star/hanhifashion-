export const categories = [
  ["ao-so-mi", "Áo sơ mi", 18, "Cotton", 490000],
  ["ao-kieu", "Áo kiểu", 14, "Satin", 590000],
  ["ao-vest-blazer", "Vest & Blazer", 12, "Tweed", 1290000],
  ["quan-tay", "Quần tây", 16, "Viscose", 790000],
  ["chan-vay", "Chân váy", 14, "Polyester Blend", 690000],
  ["dam-cong-so", "Đầm công sở", 16, "Silk", 1090000],
  ["set-cong-so", "Set công sở", 10, "Linen", 1690000],
] as const;
export const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
export { fashionColors as colors } from "./fashion-colors";
export const materials = [
  "Cotton",
  "Linen",
  "Satin",
  "Silk",
  "Tweed",
  "Polyester Blend",
  "Viscose",
  "Chiffon",
  "Vải dệt kim",
];
export const fits = [
  "Slim Fit",
  "Regular Fit",
  "Relaxed Fit",
  "Straight",
  "Wide Leg",
  "A-Line",
];
export const occasions = [
  "Daily Office",
  "Business Meeting",
  "Formal Event",
  "Work Presentation",
  "Business Casual",
];
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
export const money = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";
export const statusLabels: Record<string, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PROCESSING: "Đang chuẩn bị",
  SHIPPING: "Đang giao",
  DELIVERED: "Đã giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  UNPAID: "Chưa thanh toán",
  PAID: "Đã thanh toán",
  REFUNDED: "Đã hoàn tiền",
  DELIVERY_FAILED: "Giao không thành công",
  RETURNED: "Hàng đã quay về",
};
export const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["SHIPPING", "RETURNED"],
  RETURNED: ["CANCELLED"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};
export function calculateTotals(
  subtotal: number,
  coupon?: {
    type: string;
    value: number;
    minimum: number;
    maximum: number | null;
  },
) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0 || subtotal > 2147483647)
    throw Error("Tổng giá trị hàng không hợp lệ hoặc vượt giới hạn đơn hàng.");
  if (
    coupon &&
    (!["PERCENT", "FIXED"].includes(coupon.type) ||
      !Number.isSafeInteger(coupon.value) ||
      coupon.value < 0 ||
      (coupon.type === "PERCENT" && coupon.value > 100) ||
      !Number.isSafeInteger(coupon.minimum) ||
      coupon.minimum < 0 ||
      (coupon.maximum != null &&
        (!Number.isSafeInteger(coupon.maximum) || coupon.maximum < 0)))
  )
    throw Error("Cấu hình giảm giá không hợp lệ.");
  let discount = 0;
  if (coupon && subtotal >= coupon.minimum)
    discount =
      coupon.type === "PERCENT"
        ? Math.floor((subtotal * coupon.value) / 100)
        : coupon.value;
  if (coupon?.maximum != null) discount = Math.min(discount, coupon.maximum);
  discount = Math.min(subtotal, Math.max(0, discount));
  const shipping = subtotal - discount >= 1000000 ? 0 : 30000;
  const total = subtotal - discount + shipping;
  if (total > 2147483647)
    throw Error("Tổng thanh toán vượt giới hạn đơn hàng.");
  return { subtotal, discount, shipping, total };
}
export const sizeGuide = sizes.map((size, i) => ({
  size,
  bust: 80 + i * 4,
  waist: 62 + i * 4,
  hip: 86 + i * 4,
  shoulder: 35 + i,
  length: 58 + i,
  sleeve: 55 + i,
  trouser: 96 + i,
  skirt: 62 + i,
}));

export const effectivePrice = (
  product: { price: number; salePrice?: number | null },
  variant?: { priceOverride?: number | null },
) => variant?.priceOverride ?? product.salePrice ?? product.price;
