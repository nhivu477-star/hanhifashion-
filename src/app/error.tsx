"use client";
import { LocalizedContent } from "@/components/localization";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <LocalizedContent>
      <main className="container empty">
        <h1>Có lỗi khi tải trang</h1>
        <p>Vui lòng kiểm tra kết nối với cơ sở dữ liệu và thử lại.</p>
        <button className="button" onClick={reset}>
          THỬ LẠI
        </button>
      </main>
    </LocalizedContent>
  );
}
