import { ShopChatLauncher } from "@/components/support-chat";
import {
  PreferenceProvider,
  LocalizedContent,
} from "@/components/localization";
import {
  readPreferences,
  currencyConfiguration,
} from "@/lib/localization/server";
import { currentUser } from "@/lib/auth";
import { isStaff, can } from "@/lib/rbac";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { ContactLinks } from "@/components/contact-links";
import { BrandLogo } from "@/components/brand-logo";
import localFont from "next/font/local";
import type { Metadata } from "next";
import { Header } from "@/components/store";
import { db } from "@/lib/db";
import Link from "next/link";
import "./globals.css";
const editorial = localFont({
  src: [
    { path: "../../public/fonts/lora-1.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/lora-0.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-editorial",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const functional = localFont({
  src: [
    {
      path: "../../public/fonts/lsoul-roboto-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/lsoul-roboto-500.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/lsoul-roboto-600.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/lsoul-roboto-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-ui",
  display: "swap",
  adjustFontFallback: "Arial",
});
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "HÀ NHI FASHION | Thanh lịch mỗi ngày",
    template: "%s | HÀ NHI FASHION",
  },
  description: "Thời trang nữ, giày, túi và phụ kiện. HÀ NHI FASHION.",
  robots: { index: false, follow: false },
  metadataBase: new URL("http://localhost:3000"),
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = Object.fromEntries(
    (await db.storeSetting.findMany()).map((s) => [s.key, s.value]),
  );
  const navigation = await db.category.findMany({
    where: { parentId: null, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  const viewer = await currentUser();
  const [preference, currencyConfig] = await Promise.all([
    readPreferences(viewer?.id),
    currencyConfiguration(),
  ]);
  return (
    <html lang={preference.language}>
      {/* Browser extensions may add body attributes before React hydrates.
          Ignore only this element's attribute differences; child mismatches still warn. */}
      <body
        className={
          editorial.variable + " " + functional.variable + " fashion-store"
        }
        suppressHydrationWarning
      >
        <PreferenceProvider
          initialPreference={preference}
          config={currencyConfig}
        >
          <LocalizedContent>
            <Suspense fallback={null}>
              <AnalyticsTracker />
            </Suspense>
            <Header
              managementHref={
                viewer && isStaff(viewer.role)
                  ? viewer.role === "SELLER"
                    ? "/seller"
                    : "/admin"
                  : undefined
              }
              navigation={navigation}
              contactPhone={settings.contactPhone}
              announcement={
                settings.announcement ?? "THANH LỊCH MỖI NGÀY CÙNG HÀ NHI"
              }
            />
            {children}
            {(!viewer || viewer.role === "CUSTOMER" || can(viewer.role, "inquiries.read")) && <ShopChatLauncher userId={viewer?.id} staff={!!viewer && isStaff(viewer.role)} />}
            <footer className="footer">
              <div className="footer-top">
                <div className="footer-brand">
                  <Link className="wordmark" href="/">
                    <BrandLogo />
                  </Link>
                  <p>
                    Thanh lịch trong từng chi tiết.
                    <br />
                    Tự tin trong từng khoảnh khắc.
                  </p>
                  {settings.footerAddress &&
                    !settings.footerAddress.includes("demo") && (
                      <p className="small">{settings.footerAddress}</p>
                    )}
                  <img
                    className="brand-seal"
                    src="/images/brand-original.png"
                    alt="Logo gốc HÀ NHI FASHION"
                  />
                </div>
                <div>
                  <h3>SẢN PHẨM</h3>
                  {navigation
                    .filter((c) => c.slug !== "ao-khoac-len")
                    .map((c) => [c.slug, c.name])
                    .map((c) => (
                      <Link key={c[0]} href={"/" + c[0]}>
                        {c[1]}
                      </Link>
                    ))}
                </div>
                <div>
                  <h3>HỖ TRỢ</h3>
                  {[
                    ["huong-dan-chon-size", "Hướng dẫn chọn size"],
                    ["chinh-sach-giao-hang", "Chính sách giao hàng"],
                    ["chinh-sach-doi-tra", "Chính sách đổi trả"],
                    ["huong-dan-mua-hang", "Hướng dẫn mua hàng"],
                    ["thanh-toan-va-xac-nhan", "Thanh toán & xác nhận đơn"],
                    ["lien-he", "Liên hệ"],
                  ].map((c) => (
                    <Link key={c[0]} href={"/" + c[0]}>
                      {c[1]}
                    </Link>
                  ))}
                </div>
                <div>
                  <h3>KẾT NỐI VỚI HÀ NHI FASHION</h3>
                  <ContactLinks compact />
                  <Link href="/admin">Quản trị cửa hàng</Link>
                </div>
              </div>
              <div className="footer-bottom">
                <span>© {new Date().getFullYear()} HÀ NHI FASHION</span>
                <div>
                  <Link href="/chinh-sach-bao-mat">Bảo mật</Link>
                  <Link href="/dieu-khoan-su-dung">Điều khoản</Link>
                </div>
              </div>
            </footer>
          </LocalizedContent>
        </PreferenceProvider>
      </body>
    </html>
  );
}
