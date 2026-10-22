import { LocalizedContent } from "@/components/localization";
import Link from "next/link";
import { db } from "@/lib/db";
import { type Params, scalar } from "@/lib/queries";
import { SimpleForm, type Field } from "./store";
import { MediaUpload } from "./media-upload";
export async function MediaLibrary({ query }: { query: Params }) {
  const selected = scalar(query.asset);
  const asset = selected
    ? await db.mediaAsset.findUnique({ where: { id: selected } })
    : null;
  const productId = scalar(query.product) || asset?.productId || "";
  const products = await db.product.findMany({
    select: { id: true, name: true, sku: true },
    orderBy: { sku: "asc" },
  });
  const product = productId
    ? await db.product.findUnique({
        where: { id: productId },
        include: { colors: true },
      })
    : null;
  const role = scalar(query.role);
  const status = scalar(query.status);
  const page = Math.max(1, Number(scalar(query.page)) || 1);
  const where = {
    ...(productId ? { productId } : {}),
    ...(role ? { role } : {}),
    ...(status ? { reviewStatus: status } : {}),
  };
  const [assets, count] = await Promise.all([
    db.mediaAsset.findMany({
      where,
      include: {
        product: { select: { sku: true } },
        color: { select: { name: true } },
      },
      orderBy: { retrievedAt: "desc" },
      take: 24,
      skip: (page - 1) * 24,
    }),
    db.mediaAsset.count({ where }),
  ]);
  const fields: Field[] = [
    { name: "localPath", label: "Đường dẫn tệp nội bộ" },
    {
      name: "originalSourceUrl",
      label: "URL nguồn gốc hoặc hồ sơ cho phép sử dụng",
    },
    { name: "creator", label: "Tác giả / nhà cung cấp", required: false },
    { name: "licenseType", label: "Loại giấy phép" },
    { name: "licenseReference", label: "Liên kết giấy phép / hồ sơ bản quyền" },
    {
      name: "role",
      label: "Vai trò ảnh",
      options: [
        { value: "DEVELOPMENT", label: "Bản dựng xem nội bộ" },
        { value: "EDITORIAL", label: "Cảm hứng / bộ sưu tập" },
        { value: "PRODUCT", label: "Ảnh hàng hóa thực tế" },
      ],
    },
    {
      name: "authorizedUse",
      label: "Phạm vi sử dụng",
      options: [
        { value: "LOCAL_PREVIEW_ONLY", label: "Chỉ xem trên localhost" },
        { value: "EDITORIAL_CAMPAIGN", label: "Nội dung cảm hứng" },
        { value: "PRODUCT_SALE", label: "Trưng bày đúng sản phẩm để bán" },
      ],
    },
    {
      name: "colorId",
      label: "Màu liên kết",
      required: false,
      options: [
        { value: "", label: "Không liên kết màu" },
        ...(product?.colors ?? []).map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    {
      name: "reviewStatus",
      label: "Trạng thái xét duyệt",
      options: ["PENDING", "APPROVED", "REJECTED", "DEVELOPMENT"].map(
        (value) => ({
          value,
          label: (
            {
              PENDING: "Chờ duyệt",
              APPROVED: "Đã duyệt",
              REJECTED: "Từ chối",
              DEVELOPMENT: "Chỉ phát triển",
            } as Record<string, string>
          )[value],
        }),
      ),
    },
    {
      name: "garmentVerified",
      label: "Đã xác minh ảnh đúng trang phục, chi tiết và màu thực tế",
      type: "checkbox",
    },
    {
      name: "verificationNotes",
      label: "Bằng chứng quyền dùng, hạn chế, đối chiếu trang phục và màu",
      type: "textarea",
    },
    {
      name: "focalX",
      label: "Điểm lấy nét ngang (%)",
      type: "number",
      min: 0,
      max: 100,
    },
    {
      name: "focalY",
      label: "Điểm lấy nét dọc (%)",
      type: "number",
      min: 0,
      max: 100,
    },
  ];
  return (
    <LocalizedContent>
      {
        <>
          <h1>Thư viện ảnh & quyền sử dụng</h1>
          <p>
            Ảnh cảm hứng không được dùng làm bằng chứng ảnh của một sản phẩm
            đang bán. Bản dựng nội bộ luôn chờ thay bằng ảnh hàng thật.
          </p>
          <form className="search-form media-filters" method="get">
            <select
              aria-label="Sản phẩm quản lý ảnh"
              name="product"
              defaultValue={productId}
            >
              <option value="">Toàn bộ thư viện</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name}
                </option>
              ))}
            </select>
            <select name="role" defaultValue={role} aria-label="Loại ảnh">
              <option value="">Mọi loại</option>
              {["EDITORIAL", "PRODUCT", "DEVELOPMENT"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={status}
              aria-label="Trạng thái ảnh"
            >
              <option value="">Mọi trạng thái</option>
              {["PENDING", "APPROVED", "REJECTED", "DEVELOPMENT"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <button className="button">LỌC</button>
          </form>
          <p>
            {count} tài sản ảnh ·{" "}
            {product?.publicationStatus ?? "Thư viện nội bộ"}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Nguồn / tác giả</th>
                  <th>Quyền sử dụng</th>
                  <th>Sản phẩm / màu</th>
                  <th>Duyệt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <img
                        src={a.localPath}
                        width="60"
                        height="80"
                        style={{ objectFit: "contain" }}
                        alt="Xem trước nội bộ"
                      />
                    </td>
                    <td>
                      <a
                        href={
                          a.originalSourceUrl.startsWith("https:")
                            ? a.originalSourceUrl
                            : undefined
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {a.creator || "Nguồn nội bộ"}
                      </a>
                      <br />
                      {a.retrievedAt.toLocaleDateString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                    </td>
                    <td>
                      {a.licenseType}
                      <br />
                      {a.authorizedUse}
                    </td>
                    <td>
                      {a.product?.sku ?? "Cảm hứng"}
                      <br />
                      {a.color?.name}
                    </td>
                    <td>{a.reviewStatus}</td>
                    <td>
                      <Link
                        href={
                          "?asset=" +
                          a.id +
                          (a.productId ? "&product=" + a.productId : "")
                        }
                      >
                        Xem / duyệt
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="pagination" aria-label="Phân trang thư viện">
            {Array.from({ length: Math.ceil(count / 24) }, (_, i) => {
              const p = new URLSearchParams();
              if (productId) p.set("product", productId);
              if (role) p.set("role", role);
              if (status) p.set("status", status);
              p.set("page", String(i + 1));
              return (
                <Link
                  key={i}
                  href={"?" + p}
                  aria-current={page === i + 1 ? "page" : undefined}
                >
                  {i + 1}
                </Link>
              );
            })}
          </nav>
          <details className="catalog-admin-feature" open={!!asset}>
            <summary>
              {asset ? "Xét duyệt hồ sơ ảnh" : "Đăng ký ảnh mới"}
            </summary>
            <MediaUpload />
            <SimpleForm
              key={(asset?.id ?? "new") + productId}
              action="admin/media"
              initial={{
                role: "DEVELOPMENT",
                authorizedUse: "LOCAL_PREVIEW_ONLY",
                reviewStatus: "PENDING",
                focalX: 50,
                focalY: 50,
                ...asset,
                productId: productId || null,
              }}
              fields={fields}
            />
          </details>
          {asset && (
            <details className="catalog-admin-feature">
              <summary>Xóa hồ sơ ảnh không còn sử dụng</summary>
              <p>
                Chỉ xóa metadata khi không còn tham chiếu. Tệp gốc và ảnh trong
                đơn cũ được giữ nguyên.
              </p>
              <SimpleForm
                action="admin/media-delete"
                initial={{ id: asset.id }}
                fields={[
                  {
                    name: "reason",
                    label: "Lý do xóa hồ sơ ảnh (tối thiểu 10 ký tự)",
                  },
                ]}
                submit="XÁC NHẬN XÓA HỒ SƠ ẢNH"
              />
            </details>
          )}
          {product && (
            <section>
              <h2>Khả năng mở bán: {product.sku}</h2>
              <p>
                READY chỉ được chấp nhận khi mọi màu có ảnh hàng thật được
                duyệt, đúng sản phẩm và nguồn tồn kho đã xác minh. Chỉnh sửa ảnh
                sẽ đưa sản phẩm về chờ duyệt.
              </p>
              <SimpleForm
                key={product.id + product.publicationStatus}
                action="admin/publication"
                initial={{ productId: product.id, ...product }}
                fields={[
                  {
                    name: "merchandiseVerified",
                    label: "Đã kiểm tra hàng hóa thực tế và thông số",
                    type: "checkbox",
                  },
                  {
                    name: "publicationStatus",
                    label: "Trạng thái xuất bản",
                    options: [
                      { value: "DRAFT", label: "Bản nháp" },
                      { value: "PENDING_ASSETS", label: "Chờ ảnh / xác minh" },
                      { value: "READY", label: "Đủ điều kiện mở bán" },
                    ],
                  },
                ]}
              />
              <Link href={"/admin/san-pham/" + product.id}>
                Sửa màu, thư viện và tồn kho sản phẩm
              </Link>
            </section>
          )}
        </>
      }
    </LocalizedContent>
  );
}
