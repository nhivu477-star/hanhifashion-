export const productSkuPattern = /^HN-(TP|G|T|PK)-\d{4}$/;
const skuGroups: Readonly<Record<string, string>> = {
  "trang-phuc": "TP",
  ao: "TP",
  dam: "TP",
  "quan-vay": "TP",
  "bo-trang-phuc": "TP",
  "ao-so-mi": "TP",
  "ao-kieu": "TP",
  "ao-vest-blazer": "TP",
  "quan-tay": "TP",
  "chan-vay": "TP",
  "dam-cong-so": "TP",
  "set-cong-so": "TP",
  "ao-khoac-len": "TP",
  giay: "G",
  "tui-xach": "T",
  "phu-kien": "PK",
};
export function productSkuPrefix(categorySlug: string) {
  const group = Object.hasOwn(skuGroups, categorySlug) ? skuGroups[categorySlug] : undefined;
  if (!group) throw new Error('Danh mục chưa có nhóm mã sản phẩm.');
  return `HN-${group}-`;
}
export function nextProductSku(prefix: string, existing: {sku: string}[]) {
  const last = existing.reduce((max, p) => p.sku.startsWith(prefix) && productSkuPattern.test(p.sku) ? Math.max(max, Number(p.sku.slice(prefix.length))) : max, 0);
  if (last >= 9999) throw new Error('Nhóm sản phẩm đã hết dải mã 0001–9999.');
  return prefix + String(last + 1).padStart(4, '0');
}
