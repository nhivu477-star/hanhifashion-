"use client";
import { LocalizedContent } from "@/components/localization";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { Menu, Search, Store, Bell, UserRound } from "lucide-react";
import Link from "next/link";

export default function Loading() {
  const path = usePathname();
  if (/^\/(admin|seller)(\/|$)/.test(path)) {
    return (
      <main className="admin-shell admin-redesign" aria-busy="true">
        <div className="admin-workspace">
          <header className="admin-topbar">
            <div className="admin-header-brand">
              <button
                className="admin-menu-button"
                disabled
                aria-label="Đang tải menu quản trị"
              >
                <Menu size={22} />
              </button>
              <Link className="admin-header-logo" href="/admin">
                <BrandLogo />
              </Link>
            </div>
            <div className="admin-command-search">
              <input
                placeholder="Tìm chức năng quản trị…"
                aria-label="Tìm chức năng quản trị"
                disabled
              />
              <Search size={24} aria-hidden="true" />
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
              </details>
              <details className="admin-profile">
                <summary aria-label="Tài khoản">
                  <UserRound size={24} />
                  <span className="admin-account-label">Tài khoản</span>
                </summary>
              </details>
            </div>
          </header>
          <div className="admin-content" role="status">
            Đang tải dữ liệu quản trị…
          </div>
        </div>
      </main>
    );
  }
  return (
    <LocalizedContent>
      <main className="container loading" role="status">
        Đang chuẩn bị thiết kế cho nàng...
      </main>
    </LocalizedContent>
  );
}
