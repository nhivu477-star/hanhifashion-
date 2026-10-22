"use client";
import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
export function AnalyticsTracker() {
  const path = usePathname(),
    params = useSearchParams();
  const last = useRef("");
  const key = path + "?" + params.toString();
  useEffect(() => {
    if (path.startsWith("/admin") || last.current === key) return;
    last.current = key;
    const type = path.startsWith("/san-pham/")
      ? "PRODUCT_VIEWED"
      : path === "/tim-kiem"
        ? "PRODUCT_SEARCHED"
        : path === "/thanh-toan"
          ? "CHECKOUT_STARTED"
          : "SESSION_STARTED";
    const utm = Object.fromEntries(
      ["source", "medium", "campaign", "content", "term"].flatMap((k) =>
        params.get("utm_" + k) ? [[k, params.get("utm_" + k)]] : [],
      ),
    );
    void fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        eventKey: crypto.randomUUID(),
        ...(type === "PRODUCT_VIEWED" ? { slug: path.split("/")[2] } : {}),
        utm,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [key, path, params]);
  return null;
}
