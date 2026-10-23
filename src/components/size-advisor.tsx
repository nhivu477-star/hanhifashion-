"use client";
import { LocalizedContent } from "@/components/localization";

import { useEffect, useRef, useState } from "react";
import { adviseSize, bodyInput, type Chart } from "@/lib/sizing";
import { useProductSelection } from "./product-selection";
export function SizeAdvisor({
  product: p,
  chart,
}: {
  product: any;
  chart: Chart | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"advisor" | "chart">("advisor");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof adviseSize> | null>(
    null,
  );
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result)
      resultRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
  }, [result]);
  const { color, setSize } = useProductSelection();
  const variants = p.variants.filter((v: any) => v.color === color);
  function open(mode: "advisor" | "chart") {
    setMode(mode);
    setResult(null);
    setErrors({});
    dialog.current?.showModal();
  }
  function clear() {
    dialog.current?.querySelector("form")?.reset();
    setErrors({});
    setResult(null);
  }
  function close() {
    clear();
    dialog.current?.close();
  }
  const labels = [
    ["height", "Chiều cao (*)", "cm", "Ví dụ: 160"],
    ["weight", "Cân nặng (*)", "kg", "Ví dụ: 50"],
    ["bust", "Vòng ngực", "cm", "Không bắt buộc"],
    ["waist", "Vòng eo", "cm", "Không bắt buộc"],
    ["hips", "Vòng mông", "cm", "Không bắt buộc"],
  ];
  const measurements = [
    ["bust", "Vòng ngực"],
    ["waist", "Vòng eo"],
    ["hips", "Vòng mông"],
    ["length", "Dài áo/váy/quần"],
    ["sleeve", "Dài tay"],
    ["shoulder", "Ngang vai"],
    ["inseam", "Dài trong ống"],
  ].filter(([k]) => chart?.rows.some((r) => (r as any)[k] !== undefined));
  return (
    <LocalizedContent>
      {
        <div className="size-help">
          <div className="size-help-links">
            <button
              type="button"
              className="text-link"
              onClick={() => open("chart")}
            >
              HƯỚNG DẪN CHỌN SIZE
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => open("advisor")}
            >
              TƯ VẤN CHỌN SIZE
            </button>
          </div>
          <p className="small muted">
            Chưa chắc chắn về kích cỡ? Để HÀ NHI giúp nàng chọn size phù hợp
            nhé.
          </p>
          <dialog
            ref={dialog}
            className="size-advisor"
            aria-labelledby="size-advisor-title"
            onCancel={clear}
            onClose={clear}
            onClick={(e) => {
              if (e.target === dialog.current) close();
            }}
          >
            <div className="advisor-content">
              <button
                className="advisor-close icon-button"
                aria-label="Đóng tư vấn size"
                onClick={close}
              >
                ×
              </button>
              <h2 id="size-advisor-title">
                {mode === "advisor"
                  ? "TƯ VẤN CHỌN SIZE CÙNG HÀ NHI"
                  : "HƯỚNG DẪN CHỌN SIZE"}
              </h2>
              {mode === "advisor" ? (
                <>
                  <p>
                    Chỉ cần chia sẻ một vài thông tin cơ bản, HÀ NHI sẽ gợi ý
                    kích cỡ để nàng dễ dàng lựa chọn hơn.
                  </p>
                  <form
                    noValidate
                    onSubmit={(e) => {
                      e.preventDefault();
                      const parsed = bodyInput.safeParse(
                        Object.fromEntries(new FormData(e.currentTarget)),
                      );
                      if (!parsed.success) {
                        setErrors(
                          Object.fromEntries(
                            parsed.error.issues.map((i) => [
                              i.path[0],
                              i.message,
                            ]),
                          ),
                        );
                        setResult(null);
                        return;
                      }
                      setErrors({});
                      setResult(
                        adviseSize(
                          parsed.data,
                          chart,
                          variants,
                          p.fitClass,
                          p.stretchVerified ? p.stretchAllowance : 0,
                        ),
                      );
                    }}
                  >
                    <div className="advisor-fields">
                      {labels.map(([name, label, unit, placeholder]) => (
                        <label key={name}>
                          {label} <span className="muted">({unit})</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0.1"
                            step="any"
                            name={name}
                            placeholder={placeholder}
                            required={name === "height" || name === "weight"}
                            aria-invalid={!!errors[name]}
                            aria-describedby={
                              errors[name] ? `size-error-${name}` : undefined
                            }
                          />
                          {errors[name] && (
                            <span
                              id={`size-error-${name}`}
                              className="error"
                              role="alert"
                            >
                              {errors[name]}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                    <p className="small">* Thông tin bắt buộc.</p>
                    <p className="small muted">
                      Nếu có thêm số đo ba vòng, nàng có thể điền để nhận được
                      gợi ý sát với vóc dáng hơn.
                    </p>
                    <p className="small muted">
                      Số đo chỉ dùng trong lần tư vấn này trên trình duyệt và
                      được xóa khi đóng cửa sổ.
                    </p>
                    <button className="button full" type="submit">
                      XEM SIZE GỢI Ý
                    </button>
                  </form>
                  {result && (
                    <div ref={resultRef} className="size-result" role="status">
                      <h3>
                        {result.sizes.length
                          ? `HÀ NHI GỢI Ý SIZE ${result.sizes.join(" / ")} CHO NÀNG`
                          : "ĐỐI CHIẾU THÊM BẢNG SIZE"}
                      </h3>
                      <p>{result.reason}</p>
                      {result.sizes.map((s) => (
                        <div key={s}>
                          {result.available.includes(s) ? (
                            <button
                              type="button"
                              className="button outline"
                              onClick={() => {
                                setSize(s);
                                close();
                              }}
                            >
                              CHỌN SIZE {s}
                            </button>
                          ) : (
                            <p>
                              Size {s}: Rất tiếc, kích cỡ này hiện chưa có sẵn
                              cho màu {color}.
                            </p>
                          )}
                        </div>
                      ))}
                      {!result.sizes.length && (
                        <a
                          className="button outline size-contact-link"
                          href="/lien-he"
                        >
                          NHẮN TIN TƯ VẤN SIZE
                        </a>
                      )}
                      <button className="text-link" onClick={clear}>
                        THỬ THÔNG TIN KHÁC
                      </button>
                    </div>
                  )}
                  <button
                    className="text-link"
                    onClick={() => setMode("chart")}
                  >
                    XEM BẢNG SIZE CHI TIẾT
                  </button>
                </>
              ) : (
                <>
                  {chart ? (
                    <>
                      <p>{chart.notes}</p>
                      <div className="advisor-table">
                        <table>
                          <caption>Bảng size {p.name} · cm</caption>
                          <thead>
                            <tr>
                              <th>Size</th>
                              {measurements.map(([k, n]) => (
                                <th key={k}>{n}</th>
                              ))}
                              <th>Khác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chart.rows.map((r) => (
                              <tr key={r.size}>
                                <th>{r.size}</th>
                                {measurements.map(([k]) => (
                                  <td key={k}>
                                    {Array.isArray((r as any)[k])
                                      ? (r as any)[k].join("–")
                                      : ((r as any)[k] ?? "—")}
                                  </td>
                                ))}
                                <td>{r.extra ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        Bảng thông số sản phẩm đang được cập nhật. Nàng vui lòng
                        nhắn tin để được tư vấn trước khi chọn size.
                      </p>
                      <a
                        className="button outline size-contact-link"
                        href="/lien-he"
                      >
                        NHẮN TIN TƯ VẤN SIZE
                      </a>
                    </>
                  )}
                  <button
                    className="text-link"
                    onClick={() => setMode("advisor")}
                  >
                    TƯ VẤN CHỌN SIZE
                  </button>
                </>
              )}
            </div>
          </dialog>
        </div>
      }
    </LocalizedContent>
  );
}
