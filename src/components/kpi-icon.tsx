import {
  Wallet,
  ReceiptText,
  Clock3,
  PackageCheck,
  Users,
  PackageMinus,
  RotateCcw,
  ChartNoAxesCombined,
} from "lucide-react";

const icons = {
  "Doanh thu hôm nay": Wallet,
  "Đơn hàng hôm nay": ReceiptText,
  "Tổng đơn của tháng": ReceiptText,
  "Chờ xử lý": Clock3,
  "Đã hoàn tất": PackageCheck,
  "Đơn hoàn tất": PackageCheck,
  "Đơn hoàn/hủy": RotateCcw,
  "Khách hàng": Users,
  "Sản phẩm sắp hết": PackageMinus,
};

export function KpiIcon({ label }: { label: string }) {
  const Icon = icons[label as keyof typeof icons] ?? ChartNoAxesCombined;
  return <Icon size={20} aria-hidden="true" />;
}
