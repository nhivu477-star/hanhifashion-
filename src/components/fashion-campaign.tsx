"use client";
import { LocalizedContent } from "@/components/localization";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { SafeImage } from "./store";
const slides = [
  {
    name: "AWAK",
    type: "ÁO KHOÁC",
    href: "/san-pham/ls-awak-jacket",
  },
  {
    name: "CHARLI",
    type: "PHỐI ĐỒ",
    href: "/san-pham/ls-charli-set",
  },
  {
    name: "ERROS",
    type: "ÁO KIỂU",
    href: "/san-pham/ls-erros-top",
  },
];
export function FashionCampaign({ hasPhotography }: { hasPhotography: boolean }) {
  const rail = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const go = (i: number) =>
    rail.current?.scrollTo({
      left: ((i + 3) % 3) * rail.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  if (!hasPhotography)
    return (
      <LocalizedContent>
        <section className="fashion-campaign-placeholder">
          <p>HÀ NHI FASHION</p>
          <h1>Thiết kế dành cho nàng</h1>
          <p>
            Khám phá trang phục, giày, túi xách và phụ kiện.
            Hình ảnh sản phẩm đang được cập nhật.
          </p>
          <Link className="button outline" href="/hang-moi">
            Khám phá thiết kế <ArrowRight size={17} />
          </Link>
        </section>
      </LocalizedContent>
    );
  return (
    <LocalizedContent>
      {
        <section
          className="fashion-model-campaign"
          aria-label="Bộ ảnh thời trang mới"
          aria-roledescription="trình chiếu"
        >
          <div
            ref={rail}
            className="fashion-model-rail"
            tabIndex={0}
            onScroll={() => {
              const el = rail.current;
              if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                go(active + (e.key === "ArrowRight" ? 1 : -1));
              }
            }}
          >
            {slides.map((s, i) => (
              <article
                className={`fashion-model-slide${i === 1 ? " fashion-model-slide-charli" : ""}`}
                key={s.name}
                aria-label={`${i + 1} / 3`}
                inert={active !== i}
              >
                <div className="fashion-model-trio">
                  {(i === 1
                    ? [
                        {
                          image:
                            "/images/lsoul/products/bo-trang-phuc-charli-set-nguyen-ban-1.webp",
                          href: "/san-pham/ls-charli-set",
                          alt: "Bộ Charli — ảnh trang phục",
                          name: "Bộ Charli",
                        },
                        {
                          image:
                            "/images/lsoul/products/dam-magna-dress-nguyen-ban-1.webp",
                          href: "/san-pham/ls-magna-dress",
                          alt: "Đầm Magna — ảnh trang phục",
                          name: "Đầm Magna",
                        },
                        {
                          image:
                            "/images/lsoul/products/dam-moore-dress-nguyen-ban-1.webp",
                          href: "/san-pham/ls-moore-dress",
                          alt: "Đầm Moore — ảnh trang phục",
                          name: "Đầm Moore",
                        },
                      ]
                    : [
                        {
                          image: "/images/lsoul/banner-ers-3.webp",
                          href: "/san-pham/ls-ers-jeans",
                          alt: "Quần jeans Ers — ảnh trọn trang phục",
                          name: "Quần jeans Ers",
                        },
                        {
                          image:
                            "/images/lsoul/products/ao-erros-top-nguyen-ban-1.webp",
                          href: "/san-pham/ls-erros-top",
                          alt: "Áo Erros — ảnh trọn trang phục",
                          name: "Áo Erros",
                        },
                        {
                          image: "/images/lsoul/banner-awak-1.webp",
                          href: "/san-pham/ls-awak-jacket",
                          alt: "Áo khoác Awak — ảnh trọn trang phục",
                          name: "Áo khoác Awak",
                        },
                      ]
                  ).map((model) => (
                    <Link
                      key={model.href}
                      href={model.href}
                      aria-label={model.name}
                    >
                      <SafeImage
                        src={model.image}
                        alt={model.alt}
                        fetchPriority={i === 0 ? "high" : "auto"}
                        sizes="(max-width: 767px) 22vw, 20vw"
                      />
                    </Link>
                  ))}
                </div>
                <div className="fashion-model-copy">
                  <p>{s.type}</p>
                  {i === 0 ? <h1>{s.name}</h1> : <h2>{s.name}</h2>}
                  <Link href={s.href}>
                    Xem thiết kế <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          <div className="fashion-model-controls">
            <button aria-label="Banner trước" onClick={() => go(active - 1)}>
              <ChevronLeft size={18} />
            </button>
            {slides.map((s, i) => (
              <button
                key={s.name}
                aria-label={`Xem banner ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => go(i)}
              >
                <span />
              </button>
            ))}
            <button
              aria-label="Banner tiếp theo"
              onClick={() => go(active + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </section>
      }
    </LocalizedContent>
  );
}
