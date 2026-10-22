import Link from "next/link";
import {
  DisplayPreferences,
  LocalizedContent,
} from "@/components/localization";

export const metadata = { title: "Cài đặt hiển thị | HÀ NHI FASHION" };

export default function DisplaySettingsPage() {
  return (
    <LocalizedContent>
      <main className="container content-page display-settings-page">
        <div className="breadcrumb">
          <Link href="/">Trang chủ</Link>
          <span>/</span>
          <span>Cài đặt hiển thị</span>
        </div>
        <h1>Cài đặt hiển thị</h1>
        <DisplayPreferences />
      </main>
    </LocalizedContent>
  );
}
