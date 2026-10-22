"use client";
import { useRef, useState } from "react";
export function FeedbackForm({
  action,
  initial,
  title,
  rating = false,
}: {
  action: string;
  initial: Record<string, string>;
  title: string;
  rating?: boolean;
}) {
  const [text, setText] = useState(""),
    [score, setScore] = useState("5"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const key = useRef("");
  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        key.current ||= crypto.randomUUID();
        try {
          const r = await fetch("/api/" + action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...initial,
              eventKey: key.current,
              ...(rating
                ? { rating: Number(score), comment: text }
                : { content: text }),
            }),
          });
          const d = await r.json();
          if (!r.ok) {
            key.current = "";
            throw Error(d.error);
          }
          window.location.reload();
        } catch (e) {
          setMessage((e as Error).message);
          setBusy(false);
        }
      }}
    >
      {rating && (
        <label>
          Điểm đánh giá
          <select value={score} onChange={(e) => setScore(e.target.value)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {title}
        <textarea
          minLength={3}
          maxLength={rating ? 2000 : 3000}
          required
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            key.current = "";
          }}
        />
      </label>
      <button className="button outline" disabled={busy}>
        {rating ? "Gửi đánh giá" : "Gửi phản hồi"}
      </button>
      {message && <p role="alert">{message}</p>}
    </form>
  );
}
