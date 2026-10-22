import { LocalizedContent } from "@/components/localization";
export default function Loading() {
  return (
    <LocalizedContent>
      <main className="container loading" role="status">
        Đang chuẩn bị thiết kế cho nàng...
      </main>
    </LocalizedContent>
  );
}
