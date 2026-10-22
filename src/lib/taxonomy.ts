export const subcategories: Record<string, string[]> = {
  "ao-so-mi": [
    "Sơ mi trắng",
    "Sơ mi lụa",
    "Sơ mi cotton",
    "Sơ mi cổ đức",
    "Sơ mi cổ nơ",
    "Sơ mi tay dài",
    "Sơ mi tay ngắn",
    "Sơ mi dáng suông",
    "Sơ mi kẻ sọc",
  ],
  "ao-kieu": [
    "Áo peplum",
    "Áo tay bồng",
    "Áo cổ V",
    "Áo cổ bèo",
    "Áo cổ tròn",
    "Áo sát nách",
    "Áo satin",
    "Áo phối ren",
    "Áo chiết eo",
  ],
  "ao-vest-blazer": [
    "Blazer dáng suông",
    "Blazer chiết eo",
    "Blazer dáng ngắn",
    "Blazer oversized",
    "Blazer hai hàng khuy",
    "Áo vest công sở",
    "Blazer tweed",
  ],
  "quan-tay": [
    "Quần tây ống đứng",
    "Quần tây ống suông",
    "Quần ống rộng",
    "Quần cạp cao",
    "Quần baggy công sở",
    "Quần lửng culottes",
    "Quần ống loe",
    "Quần kaki công sở",
  ],
  "chan-vay": [
    "Chân váy bút chì",
    "Chân váy chữ A",
    "Chân váy midi",
    "Chân váy xếp ly",
    "Chân váy đuôi cá",
    "Chân váy dáng suông",
    "Chân váy ngắn công sở",
    "Chân váy tweed",
  ],
  "dam-cong-so": [
    "Đầm chữ A",
    "Đầm suông",
    "Đầm ôm",
    "Đầm sơ mi",
    "Đầm vest",
    "Đầm midi",
    "Đầm tay lỡ",
    "Đầm cổ V",
    "Đầm chiết eo",
  ],
  "set-cong-so": [
    "Set áo và chân váy",
    "Set áo và quần tây",
    "Set blazer và quần",
    "Set blazer và chân váy",
    "Set vest ba món",
    "Set tweed",
    "Set công sở tối giản",
    "Set công sở thanh lịch",
  ],
  "ao-khoac-len": [
    "Cardigan mỏng",
    "Áo khoác tweed",
    "Áo khoác dạ",
    "Áo len mỏng công sở",
    "Áo khoác dáng ngắn",
    "Áo khoác dáng dài",
  ],
};
export type NavigationCategory = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: NavigationCategory[];
};
export const officialContacts = {
  contactEmail: "hanhifashion@gmail.com",
  contactPhone: "0961982102",
  facebookUrl: "https://www.facebook.com/share/19MKdV11Hu/?mibextid=wwXIfr",
  instagramUrl: "https://www.instagram.com/ha_nhi.05?mdxt=MWh4MHhzOHkxNjhrOA==",
  instagramMessageUrl: "https://ig.me/m/ha_nhi.05",
};
