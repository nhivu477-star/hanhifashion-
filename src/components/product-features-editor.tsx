"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import { SimpleForm, UploadImage } from "./store";
import { decodeChart } from "@/lib/sizing";
function ColorEditor({ color, productId }: { color?: any; productId: string }) {
  const [upload, setUpload] = useState("");
  return (
    <LocalizedContent>
      {
        <>
          <UploadImage onChange={setUpload} />
          {upload && (
            <p>
              Ảnh đã tải: <code>{upload}</code>. Thêm đường dẫn này vào danh
              sách bên dưới; dòng đầu là ảnh chính.
            </p>
          )}
          <SimpleForm
            action="admin/color"
            initial={{
              ...color,
              productId,
              imagesText: color?.images.map((i: any) => i.url).join("\n") ?? "",
              hex: color?.hex ?? "#BFD7EA",
            }}
            fields={[
              { name: "name", label: "Tên màu" },
              { name: "hex", label: "Màu HEX", type: "color" },
              {
                name: "position",
                label: "Thứ tự màu",
                type: "number",
                min: 0,
                required: false,
              },
              {
                name: "imagesText",
                label:
                  "Ảnh của màu (đường dẫn nội bộ, mỗi dòng một ảnh; dòng đầu là ảnh chính)",
                type: "textarea",
                required: false,
              },
            ]}
          />
        </>
      }
    </LocalizedContent>
  );
}
function OutfitEditor({
  outfit,
  colorId,
  products,
}: {
  outfit?: any;
  colorId: string;
  products: any[];
}) {
  const [productId, setProductId] = useState(
    outfit?.items[0]?.productId ?? products[0]?.id ?? "",
  );
  const options = products.find((p) => p.id === productId)?.colors ?? [];
  return (
    <LocalizedContent>
      {
        <>
          <label>
            Sản phẩm phối cùng
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <SimpleForm
            key={productId}
            action="admin/outfit"
            initial={{
              id: outfit?.id,
              colorId,
              productId,
              title: outfit?.title ?? "",
              targetColorId:
                outfit?.items.find((i: any) => i.productId === productId)
                  ?.colorId ??
                options[0]?.id ??
                "",
            }}
            fields={[
              { name: "title", label: "Tên gợi ý" },
              {
                name: "targetColorId",
                label: "Màu sản phẩm phối",
                options: options.map((c: any) => ({
                  value: c.id,
                  label: c.name,
                })),
              },
              {
                name: "remove",
                label: "Xóa gợi ý này",
                type: "checkbox",
                required: false,
              },
            ]}
            submit={outfit ? "LƯU GỢI Ý" : "THÊM GỢI Ý"}
          />
        </>
      }
    </LocalizedContent>
  );
}
export function ProductFeaturesEditor({
  product: p,
  products,
}: {
  product: any;
  products: any[];
}) {
  const own = decodeChart(p.sizeChart);
  const inherited = decodeChart(p.category.sizeChart);
  const chart = own ?? inherited;
  return (
    <LocalizedContent>
      {
        <section className="catalog-admin-feature">
          <h2>Màu sắc, hình ảnh & phối đồ</h2>
          <p className="small muted">
            Danh mục mẫu sử dụng hình minh họa SVG theo màu; nội dung, chất liệu
            và thông số cần đối chiếu hàng thật trước khi mở bán. Ảnh chính toàn
            sản phẩm được đồng bộ từ ảnh đầu tiên của màu có thứ tự nhỏ nhất.
            Màu mới cần thêm size và tồn kho ở phần Biến thể bên dưới.
          </p>
          {p.colors.map((c: any) => (
            <details key={c.id}>
              <summary>
                {c.name} · {c.variants?.length ?? ""} màu-size
              </summary>
              <ColorEditor color={c} productId={p.id} />
              <h3>Gợi ý phối cùng màu này</h3>
              <p>
                Mỗi gợi ý bên dưới liên kết một món bán riêng; có thể thêm nhiều
                gợi ý.
              </p>
              {c.outfits.map((o: any) => (
                <details key={o.id}>
                  <summary>{o.title}</summary>
                  <OutfitEditor
                    outfit={o}
                    colorId={c.id}
                    products={products.filter(
                      (x) => x.id !== p.id && x.colors.length,
                    )}
                  />
                </details>
              ))}
              <details>
                <summary>Thêm gợi ý</summary>
                <OutfitEditor
                  colorId={c.id}
                  products={products.filter(
                    (x) => x.id !== p.id && x.colors.length,
                  )}
                />
              </details>
            </details>
          ))}
          <details>
            <summary>Thêm màu</summary>
            <ColorEditor productId={p.id} />
          </details>
          <h2>Bảng size & quy tắc tư vấn</h2>
          <p className="small">
            Đang dùng{" "}
            {own ? "bảng riêng của sản phẩm" : "bảng kế thừa từ danh mục"}. Các
            khoảng là số đo cơ thể (cm); thông số thành phẩm chỉ điền khi có dữ
            liệu xác nhận. Bộ mặc chung một size; chưa hỗ trợ chọn size độc lập
            từng thành phần.
          </p>
          <SimpleForm
            action="admin/size-chart"
            initial={{
              productId: p.id,
              categoryId: p.categoryId,
              kind: chart?.kind ?? "top",
              notes: chart?.notes ?? "",
              rowsJson: JSON.stringify(chart?.rows ?? [], null, 2),
              matrixJson: JSON.stringify(chart?.matrix ?? [], null, 2),
            }}
            fields={[
              {
                name: "scope",
                label: "Áp dụng",
                options: [
                  { value: "product", label: "Chỉ sản phẩm này (ghi đè)" },
                  {
                    value: "category",
                    label: "Cả danh mục (sản phẩm có bảng riêng giữ nguyên)",
                  },
                ],
              },
              {
                name: "kind",
                label: "Nhóm số đo ưu tiên",
                options: [
                  { value: "top", label: "Áo — ưu tiên ngực" },
                  { value: "bottom", label: "Quần/váy — eo và mông" },
                  { value: "dress", label: "Đầm — ba vòng" },
                  { value: "set", label: "Set — ba vòng, chung một size" },
                  { value: "knit", label: "Len — ưu tiên ngực" },
                ],
              },
              {
                name: "notes",
                label: "Ghi chú bảng thông số",
                type: "textarea",
              },
              {
                name: "rowsJson",
                label:
                  "Thông số JSON: size, bust/waist/hips: [min,max], length/sleeve/shoulder/inseam: cm, extra",
                type: "textarea",
              },
              {
                name: "matrixJson",
                label:
                  "Ma trận tham khảo JSON: size, height: [min,max], weight: [min,max]",
                type: "textarea",
                required: false,
              },
              {
                name: "inherit",
                label: "Bỏ bảng riêng, dùng bảng danh mục",
                type: "checkbox",
                required: false,
              },
            ]}
          />
        </section>
      }
    </LocalizedContent>
  );
}
