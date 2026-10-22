import { LocalizedContent } from "@/components/localization";
import Link from "next/link";
export default function NotFound() {
  return (
    <LocalizedContent>
      <main className="container empty">
        <h1>Trang chưa được tìm thấy</h1>
        <p>Nàng có thể tiếp tục khám phá những thiết kế mới.</p>
        <Link href="/" className="button">
          VỀ TRANG CHỦ
        </Link>
      </main>
    </LocalizedContent>
  );
}
