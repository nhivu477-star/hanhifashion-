import { describe, it, expect, vi } from "vitest";
import {
  GHNShippingProvider,
  ghnConfig,
  ghnStatusMap,
  STAGING_BASE,
  parcelSchema,
} from "../src/lib/shipping-providers/ghn";
const parcel = {
  clientRef: "TEST-CLIENT",
  weight: 600,
  length: 25,
  width: 20,
  height: 8,
  cod: 285000,
  insuredValue: 285000,
  content: "Đồ kiểm thử",
  recipient: {
    name: "Khách QA",
    phone: "0912345678",
    address: "123 Đường kiểm thử",
    province: "Hồ Chí Minh",
    ward: "Phường Vũng Tàu",
  },
};
const pickup = { ...parcel.recipient };
const config = {
  base: STAGING_BASE,
  shopId: 196560,
  token: "synthetic-unit-token",
  pickup,
};
const transport = vi.fn<typeof fetch>(
  async (url) =>
    new Response(
      JSON.stringify({
        code: 200,
        message: "Success",
        data: String(url).includes("province/all")
          ? [{ _id: 1000001, name: "Hồ Chí Minh" }]
          : String(url).includes("ward/all")
            ? [{ _id: 1003646, name: "Phường Vũng Tàu" }]
            : { order_code: "", total_fee: 20900 },
      }),
    ),
);
describe("GHN staging adapter contracts — fixtures only", () => {
  it("preview validates grams/cm/modern names and payer avoids double-charge", async () => {
    const p = new GHNShippingProvider(config, transport, true);
    expect(await p.calculateShippingFee(parcel)).toEqual({
      total: 20900,
      currency: "VND",
    });
    const [url, options] = transport.mock.calls.at(-1)!;
    expect(String(url)).toContain("/preview");
    const b = JSON.parse(String(options?.body));
    expect(b).toMatchObject({
      weight: 600,
      length: 25,
      is_new_to_address: true,
      to_ward_name: "Phường Vũng Tàu",
      payment_type_id: 1,
      cod_amount: 285000,
    });
    expect(b).not.toHaveProperty("to_district_id");
  });
  it("no credentials / production / alternate host never falls back", () => {
    expect(() => ghnConfig({ NODE_ENV: "test" })).toThrow("STAGING_DISABLED");
    expect(() =>
      ghnConfig({ NODE_ENV: "test", GHN_ENVIRONMENT: "production" }),
    ).toThrow();
    expect(() =>
      ghnConfig({
        NODE_ENV: "test",
        GHN_ENVIRONMENT: "staging",
        GHN_STAGING_BASE_URL: "https://online-gateway.ghn.vn",
      }),
    ).toThrow("NON_STAGING_URL_BLOCKED");
  });
  it("invalid parcel and address inputs rejected", () => {
    expect(parcelSchema.safeParse({ ...parcel, length: 0 }).success).toBe(
      false,
    );
    expect(parcelSchema.safeParse({ ...parcel, weight: 20000 }).success).toBe(
      false,
    );
    expect(
      parcelSchema.safeParse({
        ...parcel,
        recipient: { ...parcel.recipient, ward: "" },
      }).success,
    ).toBe(false);
  });
  it("modern unknown names never invent IDs", async () => {
    const p = new GHNShippingProvider(config, transport, true);
    await expect(
      p.calculateShippingFee({
        ...parcel,
        recipient: { ...parcel.recipient, province: "Không tồn tại" },
      }),
    ).rejects.toThrow("INVALID_PROVINCE");
  });
  it("maps documented statuses without inferring finance", () => {
    expect(ghnStatusMap.delivered).toBe("DELIVERED");
    expect(ghnStatusMap.money_collect_delivering).toBe("OUT_FOR_DELIVERY");
    expect(ghnStatusMap.returned).toBe("RETURNED");
    expect(ghnStatusMap.lost).toBeNull();
    expect(ghnStatusMap.picking).toBe("READY_FOR_PICKUP");
  });
  it("malformed responses and sensitive error text are sanitized", async () => {
    const p = new GHNShippingProvider(
      config,
      async () =>
        new Response(
          JSON.stringify({
            code: 400,
            message: "synthetic-unit-token",
            data: null,
          }),
          { status: 400 },
        ),
      true,
    );
    await expect(p.getShipment("TEST")).rejects.toThrow("REQUEST_REJECTED");
  });
  it("callback strict fields plus safe allowlist excludes raw PII/token", () => {
    const p = new GHNShippingProvider(config, transport, true);
    const e = p.normalizeTrackingEvent({
      OrderCode: "TEST-GHN",
      ClientOrderCode: "TEST-CLIENT",
      ShopID: 196560,
      Time: new Date().toISOString(),
      Type: "switch_status",
      Status: "delivery_fail",
      Reason: "Private address",
      Token: "secret",
      ShipperPhone: "0912345678",
    });
    expect(JSON.stringify(e.safePayload)).not.toContain("Private address");
    expect(e.safePayload).not.toHaveProperty("Token");
    expect(e.reason).toBe("GHN_RECORDED_EXCEPTION");
  });
});
