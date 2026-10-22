import catalogTerms from "./catalog-terms.json";
import { english } from "./en";
import type { Preference, CurrencyConfig } from "./config";
import { formatDisplayMoney } from "./config";
const productTerms: Record<string, string> = {
  Đầm: "Dress",
  Áo: "Top",
  Quần: "Trousers",
  "Chân váy": "Skirt",
  Bộ: "Set",
  Giày: "Shoes",
  Túi: "Bag",
  Trắng: "White",
  Đen: "Black",
  Be: "Beige",
  Hồng: "Pink",
  "Xanh pastel": "Pastel blue",
  "Xanh dương": "Blue",
  "Xanh nhạt": "Light blue",
  Nâu: "Brown",
  Vàng: "Yellow",
  Đỏ: "Red",
  Xám: "Grey",
  Tím: "Purple",
  Kem: "Cream",
  Lụa: "Silk",
  Cotton: "Cotton",
};
const folded = new Map(
  Object.entries(english).map(([key, value]) => [
    key.toLocaleLowerCase("vi"),
    value,
  ]),
);
const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function translateText(
  text: string,
  language: Preference["language"],
): string {
  if (
    language === "vi" ||
    !text.trim() ||
    /^https?:|^[\w.+-]+@[\w.-]+\.[\w]+$/.test(text.trim())
  )
    return text;
  const key = text.replace(/\s+/g, " ").trim();
  let value = english[key] ?? folded.get(key.toLocaleLowerCase("vi"));
  const stock = key.match(/^Chỉ còn (\d+) sản phẩm trong kho\.$/);
  if (stock) value = `Only ${stock[1]} items remain in stock.`;
  const cart = key.match(/^Giỏ hàng (\d+) sản phẩm$/);
  if (cart) value = `Shopping bag, ${cart[1]} items`;
  const permission = key.match(/^Không có quyền: (.+)$/);
  if (permission) value = `Permission denied: ${permission[1]}`;

  if (!value) {
    const punctuation = key.match(/^(.*?)([:.?!…])$/);
    if (punctuation && english[punctuation[1]])
      value = english[punctuation[1]] + punctuation[2];
  }
  if (!value) {
    value = key
      .replace(/^(Xin chào,?\s*)/, "Hello, ")
      .replace(/^(Đăng xuất|Xóa|Giỏ hàng)\s+/, (m) =>
        m.startsWith("Xóa")
          ? "Remove "
          : m.startsWith("Giỏ")
            ? "Bag "
            : "Sign out ",
      );
    const catalogText =
      /^(Áo|Đầm|Bộ|Chân váy|Quần|Giày|Túi|Kính|Sơ mi|Blazer|Set|Bodysuit|Cổ|Tay|Thiết kế|Chi tiết|Đường cắt|Phom dáng|Khóa kéo|Có |Họa tiết|Bề mặt|Ống quần|Đường cổ|Polyester|Spandex|Cotton|Lụa|Da)/.test(
        key,
      ) || key.includes("thuộc nhóm");
    for (const [vi, en] of (catalogText
      ? Object.entries({ ...productTerms, ...catalogTerms })
      : []
    ).sort((a, b) => b[0].length - a[0].length)) {
      value = value.replace(
        new RegExp(`(^|[\\s/·(])${escapeRegex(vi)}(?=[\\s/·):]|$)`, "g"),
        `$1${en}`,
      );
    }
    // Mixed labels contain codes, quantities or user-entered identifiers; translate known label segments only.
    value = value
      .split(/(\s*[·:|]\s*)/)
      .map((v) => english[v.trim()] ?? v)
      .join("");
  }
  return text.match(/^\s*/)?.[0] + value + (text.match(/\s*$/)?.[0] ?? "");
}
export function localizeText(
  text: string,
  p: Preference,
  config: CurrencyConfig,
) {
  const translated = translateText(text, p.language);
  if (p.currency === "VND" && p.language === "vi") return translated;
  return translated
    .replace(
      /(\d[\d.,]*)(\s*[––-]\s*)(\d[\d.,]*)\s*[đ₫]/g,
      (_, a, sep, b) =>
        `${formatDisplayMoney(Number(a.replace(/[.,]/g, "")), p, config)}${sep}${formatDisplayMoney(Number(b.replace(/[.,]/g, "")), p, config)}`,
    )
    .replace(/(?<![\d\w])(\d[\d.]*)(?:\s*[đ₫])/g, (_, number) =>
      formatDisplayMoney(Number(number.replace(/\./g, "")), p, config),
    );
}
