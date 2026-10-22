import Link from "next/link";
import credits from "@/lib/image-credits.json";

export const metadata = { title: "Nguồn ảnh & bản quyền | HÀ NHI FASHION" };

export default function ImageCreditsPage() {
  return (
    <main className="container content-page">
      <nav aria-label="Đường dẫn"><Link href="/">Trang chủ</Link> / Nguồn ảnh &amp; bản quyền</nav>
      <h1>Nguồn ảnh &amp; bản quyền</h1>
      <p>Cập nhật ngày 22.10.2026</p>
      <section>
        <h2>Hình ảnh trong bản trải nghiệm</h2>
        <p>Website là dự án demo phục vụ việc học tập và thực hành xây dựng website, không sử dụng cho mục đích thương mại. Một số hình ảnh được tham khảo từ các website bên thứ ba, không phải ảnh do HÀ NHI FASHION tự chụp và chưa được xác minh là ảnh hàng hóa do HÀ NHI cung cấp. Quyền đối với ảnh, nhãn hiệu và thiết kế thuộc về các chủ sở hữu tương ứng. Việc xuất hiện trên website không thể hiện quan hệ hợp tác, đại lý hay sự bảo trợ của các thương hiệu nguồn.</p>
      </section>
      <section>
        <h2>Lời cảm ơn</h2>
        <p>Xin chân thành cảm ơn các tác giả, chủ sở hữu hình ảnh và các nguồn LSOUL, SAINT AND SOFIA, Pexels đã tạo ra những hình ảnh được tham khảo trong quá trình học tập. Việc ghi nhận này không hàm ý các bên đã cấp phép, hợp tác hay bảo trợ cho dự án.</p>
      </section>
      <section>
        <h2>Ghi nguồn không phải giấy phép</h2>
        <p>Chưa có hồ sơ xác nhận quyền tái sử dụng các ảnh thương hiệu trong dự án. Ghi nguồn hoặc ghi “demo” không thay thế sự cho phép của chủ sở hữu. Trước khi sử dụng công khai hoặc kinh doanh, cần xác minh giấy phép cho từng ảnh, xin phép khi cần, hoặc thay bằng ảnh tự chụp hay ảnh có giấy phép phù hợp. Trang này không cấp quyền sao chép hoặc phân phối lại ảnh.</p>
        <p>Ảnh từ Pexels cần được đối chiếu với <a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer">điều kiện sử dụng của Pexels</a> và hồ sơ ảnh gốc; không mặc định mọi ảnh trong dự án đều có cùng giấy phép.</p>
      </section>
      <section>
        <h2>Danh sách nguồn đã ghi nhận</h2>
        <p>Danh sách dưới đây lấy từ hồ sơ nhập ảnh của dự án, bao gồm các ảnh từng dùng cho demo. Website nguồn không nhất thiết là tác giả hoặc chủ sở hữu quyền; thông tin còn thiếu cần tiếp tục xác minh.</p>
        {["LSOUL", "SAINT AND SOFIA", "Pexels"].map((source) => (
          <details key={source}>
            <summary>{source} — các trang nguồn</summary>
            <ul>{credits.filter((c) => c.source === source).map((c) => (
              <li key={c.url}><a href={c.url} target="_blank" rel="noreferrer">{c.title}</a></li>
            ))}</ul>
          </details>
        ))}
      </section>
      <section>
        <h2>Yêu cầu về quyền hình ảnh</h2>
        <p>Nếu bạn là chủ sở hữu quyền, vui lòng <Link href="/lien-he">liên hệ quản trị website</Link> kèm đường dẫn ảnh, trang sử dụng và căn cứ quyền sở hữu để yêu cầu kiểm tra, bổ sung thông tin hoặc gỡ bỏ.</p>
      </section>
    </main>
  );
}
