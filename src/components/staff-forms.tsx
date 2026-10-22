"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
export function StaffForm({
  operation,
  id,
  children,
  label,
  resource = "staff",
}: {
  operation: string;
  id?: string;
  children: React.ReactNode;
  label: string;
  resource?: "staff" | "accounts";
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <LocalizedContent>
      {
        <form
          className="shipping-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            const body: Record<string, unknown> = {
              ...data,
              ...(id ? { id } : {}),
            };
            if (operation === "status") body.active = data.active === "true";
            setBusy(true);
            setMessage("");
            try {
              const r = await fetch(`/api/admin/${resource}/${operation}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              });
              const response = await r.json();
              if (!r.ok) throw Error(response.error);
              window.location.reload();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {children}
          <label>
            Lý do thao tác
            <textarea name="reason" required minLength={3} maxLength={1000} />
          </label>
          <button className="button outline small-button" disabled={busy}>
            {busy ? "Đang lưu…" : label}
          </button>
          {message && <p role="alert">{message}</p>}
        </form>
      }
    </LocalizedContent>
  );
}
