import { LocalizedContent } from "@/components/localization";
import { shipmentLabels } from "@/lib/shipping-states";
export type PublicShipment = {
  reference: string;
  provider: string;
  status: string;
  carrierReference: string | null;
  providerVerification?: string;
  events: {
    status: string;
    previousStatus: string | null;
    createdAt: Date | string;
    source: string;
  }[];
};
export function ShipmentTimeline({
  shipment,
}: {
  shipment: PublicShipment | null;
}) {
  if (!shipment) return null;
  return (
    <LocalizedContent>
      {
        <section className="shipment-timeline">
          <h3>Thông tin giao nhận</h3>
          <p>{shipmentLabels[shipment.status]}</p>
          <p>Thông tin giao nhận</p>
          <p>Mã hồ sơ nội bộ: {shipment.reference}</p>
          <p className="small muted">
            Trạng thái được lưu trong cơ sở dữ liệu local; không phải vận đơn
            hãng hoặc giao hàng thật.
          </p>
          {shipment.events.map((e, i) => (
            <p key={i}>
              <time>
                {new Date(e.createdAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })}
              </time>{" "}
              · {shipmentLabels[e.status]}
              <br />
              <span className="small muted">
                {e.source === "LOCAL_MANUAL"
                  ? "Ghi nhận thủ công"
                  : "Lịch sử giao nhận"}
              </span>
            </p>
          ))}
        </section>
      }
    </LocalizedContent>
  );
}
