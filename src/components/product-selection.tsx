"use client";
import { LocalizedContent } from "@/components/localization";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
const Selection = createContext<{
  color: string;
  setColor: (c: string) => void;
  size: string;
  setSize: (s: string) => void;
} | null>(null);
export function ProductSelection({
  product,
  children,
  initialColorId,
}: {
  product: any;
  initialColorId?: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const selectedColorId = params.get("mau") ?? initialColorId;
  const [color, setColor] = useState(
    product.colors?.find((c: any) => c.id === selectedColorId)?.name ??
      product.colors?.[0]?.name ??
      product.variants[0]?.color ??
      "",
  );
  const [size, setSize] = useState("");
  const currentColor = useRef(color);
  // Back navigation may reuse server props from before the color URL changed.
  useEffect(() => {
    const target =
      product.colors?.find((c: any) => c.id === selectedColorId)?.name ??
      product.colors?.[0]?.name ??
      product.variants[0]?.color ??
      "";
    if (currentColor.current !== target) {
      currentColor.current = target;
      setColor(target);
      setSize("");
    }
  }, [product.id, product.colors, selectedColorId]);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("hn_selection:" + product.id) ?? "null",
      );
      const chosen = product.variants.find(
        (v: any) =>
          v.color === saved?.color && v.size === saved?.size && v.stock > 0,
      );
      const explicitColor = product.colors?.find(
        (c: any) => c.id === selectedColorId,
      )?.name;
      if (chosen && (!explicitColor || explicitColor === chosen.color)) {
        currentColor.current = chosen.color;
        setColor(chosen.color);
        setSize(chosen.size);
      }
    } catch {
      /* Invalid local preferences never override catalogue data. */
    }
  }, [product.id, product.variants, product.colors, selectedColorId]);
  return (
    <LocalizedContent>
      {
        <Selection.Provider
          value={{
            color,
            setColor: (c) => {
              currentColor.current = c;
              setColor(c);
              setSize("");
              const selected = product.colors?.find((v: any) => v.name === c);
              if (selected) {
                const url = new URL(window.location.href);
                url.searchParams.set("mau", selected.id);
                window.history.replaceState(null, "", url);
              }
            },
            size,
            setSize: (value) => {
              setSize(value);
              try {
                sessionStorage.setItem(
                  "hn_selection:" + product.id,
                  JSON.stringify({ color, size: value }),
                );
              } catch {
                /* Storage is optional. */
              }
            },
          }}
        >
          {children}
        </Selection.Provider>
      }
    </LocalizedContent>
  );
}
export function useProductSelection() {
  const context = useContext(Selection);
  if (!context) throw new Error("ProductSelection is required");
  return context;
}
