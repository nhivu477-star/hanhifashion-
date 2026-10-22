"use client";
import { LocalizedContent } from "./localization";
import { useState } from "react";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { ActionButton } from "./store";
import {
  Search,
  Bell,
  Menu,
  X,
  Store,
  UserRound,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  Users,
  Settings,
  ChartNoAxesCombined,
  Image,
  ShieldCheck,
  Tag,
  Folder,
  RotateCcw,
  ScrollText,
  Mail,
  LogOut,
} from "lucide-react";
const groups = [
  {
    name: "Quản trị",
    slugs: [
      "",
      "san-pham",
      "thu-vien-anh",
      "danh-muc",
      "bo-suu-tap",
      "khach-hang",
    ],
  },
  {
    name: "Vận hành",
    slugs: ["don-hang", "van-chuyen", "doi-tra", "kho-hang"],
  },
  {
    name: "Marketing",
    slugs: ["phan-tich", "ma-giam-gia", "banner", "lien-he"],
  },
  {
    name: "Hệ thống",
    slugs: ["nhan-vien", "tai-khoan", "phan-quyen", "nhat-ky", "cai-dat"],
  },
];
const pageDescriptions: Record<string, string> = {
  "san-pham": "Quản lý thiết kế, giá bán, hình ảnh và tình trạng sản phẩm.",
  "don-hang": "Theo dõi đơn mua, thanh toán và tiến trình xử lý.",
  "khach-hang": "Tra cứu thông tin và lịch sử mua hàng của khách hàng.",
  "kho-hang": "Theo dõi tồn kho, nhập xuất và lịch sử biến động theo SKU.",
  "van-chuyen": "Quản lý giao nhận, thu COD và đối soát theo từng kiện hàng.",
  "doi-tra": "Theo dõi yêu cầu đổi trả, kiểm hàng và xử lý hoàn tiền.",
  "thu-vien-anh": "Quản lý hình ảnh, nguồn sử dụng và thông tin bản quyền.",
  "danh-muc": "Sắp xếp nhóm sản phẩm và cấu trúc danh mục cửa hàng.",
  "bo-suu-tap": "Quản lý bộ sưu tập và những thiết kế liên quan.",
  "nhan-vien": "Quản lý nhân viên và quyền truy cập được cấp.",
  "tai-khoan": "Quản lý loại tài khoản, trạng thái và quyền truy cập.",
  "phan-quyen": "Tra cứu phạm vi quyền hạn theo vai trò trong hệ thống.",
  "nhat-ky": "Kiểm tra lịch sử thao tác và các thay đổi trong cửa hàng.",
  "ma-giam-gia": "Quản lý mã ưu đãi và điều kiện áp dụng.",
  banner: "Quản lý nội dung và hình ảnh hiển thị tại cửa hàng.",
  "cai-dat": "Quản lý thông tin thương hiệu và cấu hình cửa hàng.",
  "lien-he": "Theo dõi và xử lý các yêu cầu liên hệ của khách hàng.",
};
const icons: Record<string, typeof Package> = {
  "": LayoutDashboard,
  "san-pham": Package,
  "thu-vien-anh": Image,
  "danh-muc": Folder,
  "bo-suu-tap": Folder,
  "khach-hang": Users,
  "don-hang": ShoppingBag,
  "van-chuyen": Truck,
  "doi-tra": RotateCcw,
  "kho-hang": Package,
  "phan-tich": ChartNoAxesCombined,
  "ma-giam-gia": Tag,
  banner: Image,
  "lien-he": Mail,
  "nhan-vien": Users,
  "tai-khoan": Users,
  "phan-quyen": ShieldCheck,
  "nhat-ky": ScrollText,
  "cai-dat": Settings,
};
export function AdminFrame({
  tabs,
  tab,
  role,
  children,
  notifications,
  analyticsLinks,
  activePath,
}: {
  tabs: string[][];
  tab: string;
  name: string;
  role: string;
  children: React.ReactNode;
  notifications: number | null;
  analyticsLinks: string[][];
  activePath: string;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const activeSlug = analyticsLinks.some(([slug]) => slug === activePath)
    ? activePath
    : tab;
  const filtered = [...tabs, ...analyticsLinks].filter(([, label]) =>
    label.toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <LocalizedContent>
      <main
        className="admin-shell admin-redesign"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setSearch("");
          }
        }}
      >
        <aside className={"admin-nav " + (open ? "is-open" : "")} inert={!open}>
          <Link
            className="admin-brand"
            href={role === "SELLER" ? "/seller" : "/admin"}
          >
            <BrandLogo />
          </Link>
          {role === "SELLER" && (
            <p className="admin-brand-caption">BẢNG ĐIỀU KHIỂN BÁN HÀNG</p>
          )}
          <button
            className="admin-mobile-close"
            aria-label="Đóng menu quản trị"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
          <nav aria-label="Quản lý cửa hàng">
            {groups.map((group) => {
              const links = filtered.filter(
                ([slug]) =>
                  group.slugs.includes(slug) ||
                  (group.name === "Marketing" && slug.startsWith("phan-tich/")),
              );
              return (
                links.length > 0 && (
                  <div className="admin-nav-group" key={group.name}>
                    <p>{group.name}</p>
                    {links.map(([slug, label]) => {
                      const Icon =
                        icons[slug] ??
                        (slug.startsWith("phan-tich/")
                          ? ChartNoAxesCombined
                          : Settings);
                      return (
                        <Link
                          key={slug}
                          href={"/admin" + (slug ? "/" + slug : "")}
                          className={activeSlug === slug ? "active" : ""}
                          aria-current={
                            activeSlug === slug ? "page" : undefined
                          }
                          onClick={() => {
                            setOpen(false);
                            setSearch("");
                          }}
                        >
                          <Icon size={18} />
                          <span>{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )
              );
            })}
            {search && !filtered.length && <p>Không tìm thấy chức năng.</p>}
            <Link href="/cai-dat-hien-thi">
              <Settings size={18} />
              Cài đặt hiển thị
            </Link>
          </nav>
          <div className="admin-sidebar-bottom">
            <ActionButton action="logout" data={{}}>
              <LogOut size={17} /> Đăng xuất
            </ActionButton>
          </div>
        </aside>
        {open && (
          <button
            className="admin-nav-backdrop"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-header-brand">
              <button
                className="admin-menu-button"
                aria-label="Mở menu quản trị"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
              >
                <Menu size={22} />
              </button>
              <Link
                className="admin-header-logo"
                href={role === "SELLER" ? "/seller" : "/admin"}
                aria-label="HÀ NHI FASHION — Quản trị"
              >
                <BrandLogo />
              </Link>
            </div>
            <div className="admin-command-search">
              <input
                aria-label="Tìm chức năng quản trị"
                placeholder="Tìm chức năng quản trị…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                }}
              />
              <Search size={24} aria-hidden="true" />
              {search && (
                <div
                  className="admin-search-results"
                  aria-label="Kết quả tìm chức năng"
                >
                  {filtered.length ? (
                    filtered.map(([slug, label]) => (
                      <Link
                        key={slug}
                        href={"/admin" + (slug ? "/" + slug : "")}
                        onClick={() => setSearch("")}
                      >
                        {label}
                      </Link>
                    ))
                  ) : (
                    <p>Không tìm thấy chức năng.</p>
                  )}
                </div>
              )}
            </div>
            <div className="admin-topbar-actions">
              <Link
                className="admin-view-store"
                href="/"
                aria-label="Xem cửa hàng"
              >
                <Store size={24} />
                <span>Xem cửa hàng</span>
              </Link>
              <details className="admin-notifications">
                <summary aria-label="Thông báo">
                  <Bell size={19} />
                </summary>
                <div>
                  <strong>Thông báo vận hành</strong>
                  {notifications !== null && (
                    <p>
                      {notifications.toLocaleString("vi-VN")} đơn đang chờ xử lý
                    </p>
                  )}
                  {tabs.some(([slug]) => slug === "don-hang") && (
                    <Link href="/admin/don-hang">Kiểm tra đơn hàng</Link>
                  )}
                  {tabs.some(([slug]) => slug === "doi-tra") && (
                    <Link href="/admin/doi-tra">Yêu cầu đổi trả</Link>
                  )}
                  {tabs.some(([slug]) => slug === "nhat-ky") && (
                    <Link href="/admin/nhat-ky">Nhật ký vận hành</Link>
                  )}
                </div>
              </details>
              <details className="admin-profile">
                <summary aria-label="Tài khoản">
                  <UserRound size={24} aria-hidden="true" />
                  <span className="admin-account-label">Tài khoản</span>
                </summary>
                <div>
                  <Link href="/tai-khoan/thong-tin">Thông tin cá nhân</Link>
                  <Link href="/cai-dat-hien-thi">Cài đặt hiển thị</Link>
                </div>
              </details>
            </div>
          </header>
          <div className="admin-content">
            {!["", "phan-tich"].includes(tab) && (
              <div className="admin-heading">
                <div>
                  <p className="admin-breadcrumb">
                    <Link href="/admin">Quản trị</Link>
                    <span>/</span>
                    {tabs.find((t) => t[0] === tab)?.[1]}
                  </p>
                  <h1>{tabs.find((t) => t[0] === tab)?.[1] ?? "Quản trị"}</h1>
                  {pageDescriptions[tab] && (
                    <p className="admin-page-description">
                      {pageDescriptions[tab]}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="admin-page-body">{children}</div>
          </div>
        </div>
      </main>
    </LocalizedContent>
  );
}
