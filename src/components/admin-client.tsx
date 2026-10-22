"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
import { SimpleForm, UploadImage, Field } from "./store";
import { materials, fits, occasions } from "@/lib/catalog";
export function ProductEditor({
  product,
  categories,
  collections,
}: {
  product?: any;
  categories: any[];
  collections: any[];
}) {
  const [image, setImage] = useState(
    product?.images?.[0]?.url ?? "/images/ao-so-mi.svg",
  );
  const fields: Field[] = [
    { name: "name", label: "Tên sản phẩm" },
    { name: "slug", label: "Đường dẫn (chữ thường, không dấu, gạch nối)" },
    { name: "sku", label: "Mã sản phẩm (để trống để tự cấp)", required: false },
    { name: "description", label: "Mô tả ngắn (2–3 câu)", type: "textarea" },
    {
      name: "details",
      label: "Chi tiết chất liệu, cổ, tay, cạp, khóa và thành phần bộ",
      type: "textarea",
      required: false,
    },
    {
      name: "care",
      label: "Chăm sóc trang phục",
      type: "textarea",
      required: false,
    },
    {
      name: "styling",
      label: "Lời dẫn phối đồ",
      type: "textarea",
      required: false,
    },
    {
      name: "fitClass",
      label: "Phân loại phom",
      options: ["slim", "regular", "relaxed", "oversized"].map((value) => ({
        value,
        label: value,
      })),
    },
    {
      name: "stretchVerified",
      label: "Độ co giãn đã xác minh",
      type: "checkbox",
    },
    {
      name: "stretchAllowance",
      label: "Dung sai co giãn đã xác minh (cm, 0–3)",
      type: "number",
      min: 0,
      required: false,
    },
    {
      name: "categoryId",
      label: "Danh mục",
      options: categories
        .filter((c) => !c.parentId)
        .map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "subcategoryId",
      label: "Danh mục con (phải thuộc danh mục chính)",
      required: false,
      options: [
        { value: "", label: "Không phân loại thêm" },
        ...categories
          .filter((c) => c.parentId)
          .map((c) => ({
            value: c.id,
            label:
              (categories.find((p) => p.id === c.parentId)?.name ?? "") +
              " / " +
              c.name,
          })),
      ],
    },
    { name: "sleeveType", label: "Kiểu tay", required: false },
    { name: "length", label: "Chiều dài / độ dài", required: false },
    {
      name: "styleTags",
      label: "Thẻ phong cách (phân cách bằng dấu phẩy)",
      required: false,
    },
    {
      name: "material",
      label: "Chất liệu",
    },
    {
      name: "style",
      label: "Phong cách",
      options: [
        "Thanh lịch",
        "Tối giản",
        "Hiện đại",
        "Nữ tính",
        "Công sở cao cấp",
      ].map((m) => ({ value: m, label: m })),
    },
    {
      name: "fit",
      label: "Phom dáng",
      options: fits.map((m) => ({ value: m, label: m })),
    },
    {
      name: "occasion",
      label: "Dịp sử dụng",
      options: occasions.map((m, i) => ({
        value: m,
        label: [
          "Đi làm hằng ngày",
          "Họp đối tác",
          "Sự kiện trang trọng",
          "Thuyết trình",
          "Công sở thoải mái",
        ][i],
      })),
    },
    { name: "price", label: "Giá gốc (VND)", type: "number", min: 1 },
    {
      name: "salePrice",
      label: "Giá ưu đãi (để trống nếu không có)",
      type: "number",
      required: false,
      min: 1,
    },
    {
      name: "gallery",
      label: "Ảnh bổ sung (đường dẫn nội bộ, mỗi dòng một ảnh)",
      type: "textarea",
      required: false,
      value:
        product?.images
          ?.slice(1)
          .map((i: any) => i.url)
          .join("\n") ?? "",
    },
    {
      name: "active",
      label: "Đang hoạt động",
      type: "checkbox",
      value: product?.active ?? true,
    },
    { name: "featured", label: "Sản phẩm nổi bật", type: "checkbox" },
    { name: "isNew", label: "Hàng mới", type: "checkbox" },
  ];
  void collections;
  return (
    <LocalizedContent>
      {
        <div className="editor">
          <UploadImage onChange={setImage} />
          <img
            className="editor-preview"
            src={image}
            alt="Xem trước ảnh sản phẩm"
          />
          <SimpleForm
            key={image}
            action="admin/product"
            initial={{ ...product, image }}
            fields={fields}
            submit={product ? "LƯU SẢN PHẨM" : "TẠO SẢN PHẨM"}
          />
          <p className="small muted">
            Gán sản phẩm vào bộ sưu tập tại mục Bộ sưu tập. Sản phẩm mới có một
            biến thể M màu Be với tồn kho 0; thêm biến thể hoặc nhập kho để bán.
          </p>
        </div>
      }
    </LocalizedContent>
  );
}
export function CollectionEditor({
  collection,
  products,
}: {
  collection?: any;
  products: any[];
}) {
  const [ids, setIds] = useState<string[]>(
    collection?.products.map((p: any) => p.productId) ?? [],
  );
  return (
    <LocalizedContent>
      {
        <div>
          <details>
            <summary>Chọn sản phẩm ({ids.length})</summary>
            <div className="collection-product-picker">
              {products.map((p) => (
                <label className="check-label" key={p.id}>
                  <input
                    type="checkbox"
                    checked={ids.includes(p.id)}
                    onChange={(e) =>
                      setIds(
                        e.target.checked
                          ? [...ids, p.id]
                          : ids.filter((id) => id !== p.id),
                      )
                    }
                  />
                  {p.sku} · {p.name}
                </label>
              ))}
            </div>
          </details>
          <SimpleForm
            action="admin/collection"
            initial={{ ...collection, productIds: ids }}
            fields={[
              { name: "name", label: "Tên bộ sưu tập" },
              { name: "slug", label: "Đường dẫn" },
              { name: "description", label: "Mô tả", type: "textarea" },
              {
                name: "image",
                label: "Đường dẫn ảnh trong máy",
                value: collection?.image ?? "/images/hero.png",
              },
            ]}
          />
        </div>
      }
    </LocalizedContent>
  );
}
