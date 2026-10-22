"use client";
import { LocalizedContent } from "@/components/localization";

import { useState } from "react";
export function MediaUpload() {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <LocalizedContent>
      {
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/admin/upload", {
                method: "POST",
                body: new FormData(e.currentTarget),
              });
              const d = await r.json();
              if (!r.ok) throw new Error(d.error);
              setPath(d.url);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Tải ảnh hàng thật hoặc ảnh có quyền sử dụng
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "ĐANG TẢI…" : "TẢI ẢNH"}
          </button>
          {path && (
            <p role="status">
              Đường dẫn để đăng ký bên dưới: <code>{path}</code>
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </form>
      }
    </LocalizedContent>
  );
}
