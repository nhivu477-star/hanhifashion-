import { describe, it, expect } from "vitest";
import {
  customerAddressSchema,
  currencyConfigSchema,
  defaultCurrencyConfig,
  defaultPreference,
  formatDisplayMoney,
  normalizePreference,
  preferenceSchema,
  regions,
  formatAddress,
} from "../src/lib/localization/config";
import { localizeText, translateText } from "../src/lib/localization/translate";
const base = {
  name: "Test Customer",
  email: "customer@example.test",
  phone: "0912345678",
  street: "12 Test Street",
  province: "Hà Nội",
  ward: "Hoàn Kiếm",
};
describe("Shared localization, money and address contracts", () => {
  it("validates allowed preferences without role/user injection", () => {
    expect(
      preferenceSchema.safeParse({ ...defaultPreference, userId: "other" })
        .success,
    ).toBe(false);
    expect(
      preferenceSchema.safeParse({ ...defaultPreference, region: "ZZ" })
        .success,
    ).toBe(false);
    expect(
      normalizePreference({ ...defaultPreference, currency: "ZZZ" }).currency,
    ).toBe("VND");
  });
  it("converts display only and retains original VND input", () => {
    const n = 260000;
    expect(
      formatDisplayMoney(
        n,
        { ...defaultPreference, language: "en", currency: "USD" },
        defaultCurrencyConfig,
      ),
    ).toBe("$10.00");
    expect(n).toBe(260000);
    expect(
      localizeText(
        "260.000đ",
        { ...defaultPreference, currency: "USD" },
        defaultCurrencyConfig,
      ),
    ).toContain("10");
    expect(
      localizeText("260.000đ", defaultPreference, defaultCurrencyConfig),
    ).toBe("260.000đ");
    expect(
      localizeText(
        "260.000–520.000đ",
        { ...defaultPreference, language: "en", currency: "USD" },
        defaultCurrencyConfig,
      ),
    ).toBe("$10.00–$20.00");
  });
  it("keeps VND at rate 1, requires USD and rejects duplicate/invalid rates", () => {
    expect(currencyConfigSchema.safeParse(defaultCurrencyConfig).success).toBe(
      true,
    );
    expect(
      currencyConfigSchema.safeParse({
        ...defaultCurrencyConfig,
        rates: [...defaultCurrencyConfig.rates, defaultCurrencyConfig.rates[0]],
      }).success,
    ).toBe(false);
    expect(
      currencyConfigSchema.safeParse({
        ...defaultCurrencyConfig,
        rates: defaultCurrencyConfig.rates.map((r) => ({
          ...r,
          vndPerUnit: r.code === "VND" ? 2 : r.vndPerUnit,
        })),
      }).success,
    ).toBe(false);
    expect(
      currencyConfigSchema.safeParse({
        ...defaultCurrencyConfig,
        rates: defaultCurrencyConfig.rates.map((r) => ({
          ...r,
          vndPerUnit: -1,
        })),
      }).success,
    ).toBe(false);
  });
  it("uses region-specific postal and phone validation", () => {
    expect(customerAddressSchema.safeParse(base).success).toBe(true);
    expect(
      customerAddressSchema.safeParse({
        ...base,
        countryCode: "US",
        postalCode: "10001",
        phone: "----------",
      }).success,
    ).toBe(false);
    expect(
      formatAddress({
        ...base,
        countryCode: "US",
        province: "NY",
        ward: "New York",
        postalCode: "10001",
      }),
    ).toContain("NY 10001");
    expect(
      customerAddressSchema.safeParse({ ...base, phone: "+12025550123" })
        .success,
    ).toBe(false);
    expect(
      customerAddressSchema.safeParse({
        ...base,
        countryCode: "US",
        phone: "+12025550123",
        postalCode: "10001",
      }).success,
    ).toBe(true);
    expect(
      customerAddressSchema.safeParse({
        ...base,
        countryCode: "US",
        phone: "+12025550123",
        postalCode: "abc",
      }).success,
    ).toBe(false);
    expect(
      customerAddressSchema.safeParse({
        ...base,
        countryCode: "SG",
        postalCode: "238801",
        province: "",
        ward: "",
      }).success,
    ).toBe(true);
    expect(
      customerAddressSchema.safeParse({
        ...base,
        countryCode: "GB",
        postalCode: "SW1A 1AA",
      }).success,
    ).toBe(true);
    expect(
      Object.entries(regions)
        .filter(([, r]) => r.shipping)
        .map(([code]) => code),
    ).toEqual(["VN"]);
  });
  it("translates controls and product features without altering identifiers", () => {
    expect(translateText("ĐĂNG NHẬP", "en")).toBe("SIGN IN");
    expect(translateText("Trắng", "en")).toBe("White");
    expect(translateText("Một cỡ", "en")).toBe("One size");
    expect(translateText("Chỉ còn 2 sản phẩm trong kho.", "en")).toBe(
      "Only 2 items remain in stock.",
    );
    expect(translateText("Chi tiết dây đan. Có túi.", "en")).toBe(
      "Lace-up detail. Pockets.",
    );
    expect(translateText("HN-LS-ASLUR-S", "en")).toBe("HN-LS-ASLUR-S");
    expect(translateText("customer@example.test", "en")).toBe(
      "customer@example.test",
    );
    expect(translateText("Đăng nhập", "vi")).toBe("Đăng nhập");
    expect(translateText("Nguyễn Thu Hồng", "en")).toBe("Nguyễn Thu Hồng");
    expect(translateText("Xin chào, Hồng", "en")).toBe("Hello, Hồng");
  });
});
