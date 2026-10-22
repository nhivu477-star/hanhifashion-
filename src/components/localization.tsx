"use client";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import {
  defaultPreference,
  defaultCurrencyConfig,
  regions,
  type Preference,
  type CurrencyConfig,
} from "@/lib/localization/config";
import { localizeText, translateText } from "@/lib/localization/translate";
type State = {
  preference: Preference;
  config: CurrencyConfig;
  save: (p: Preference) => Promise<void>;
};
const Context = createContext<State>({
  preference: defaultPreference,
  config: defaultCurrencyConfig,
  save: async () => {
    throw Error("PreferenceProvider required");
  },
});
export function usePreferences() {
  return useContext(Context);
}
export function PreferenceProvider({
  initialPreference,
  config,
  children,
}: {
  initialPreference: Preference;
  config: CurrencyConfig;
  children: ReactNode;
}) {
  const router = useRouter();
  const [preference, setPreference] = useState(initialPreference);
  useEffect(() => {
    setPreference(initialPreference);
  }, [
    initialPreference.language,
    initialPreference.region,
    initialPreference.currency,
  ]);
  useEffect(() => {
    document.documentElement.lang = preference.language;
  }, [preference.language]);
  useEffect(() => {
    const sync = async (e: StorageEvent) => {
      if (e.key !== "hn_preferences_changed") return;
      try {
        const r = await fetch("/api/preferences", { cache: "no-store" });
        if (r.ok) {
          setPreference((await r.json()).preference);
          router.refresh();
        }
      } catch {
        /* Next explicit save retries synchronization. */
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [router]);
  async function save(p: Preference) {
    const r = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error);
    setPreference(result.preference);
    try {
      localStorage.setItem("hn_preferences_changed", String(Date.now()));
    } catch {
      /* Cookie and SQLite persistence still work. */
    }
    router.refresh();
  }
  return (
    <Context.Provider value={{ preference, config, save }}>
      {children}
    </Context.Provider>
  );
}
/** Localize React text and accessible labels without DOM mutation, layout wrappers or changing form values.
 Every rendered component owns this boundary, including components with asynchronous client state. */
export function LocalizedContent({ children }: { children: ReactNode }) {
  const { preference, config } = usePreferences();
  return useMemo(() => {
    const visit = (nodes: ReactNode): ReactNode =>
      Children.map(nodes, (node) => {
        if (typeof node === "string")
          return localizeText(node, preference, config);
        if (!isValidElement(node)) return node;
        const element = node as ReactElement<Record<string, unknown>>;
        const props = element.props;
        if (
          ["script", "style", "code", "pre"].includes(String(element.type)) ||
          props["data-localize"] === "off"
        )
          return node;
        const changes: Record<string, unknown> = {};
        for (const key of ["title", "placeholder", "aria-label", "alt"])
          if (typeof props[key] === "string")
            changes[key] = translateText(
              props[key] as string,
              preference.language,
            );
        if (props.children !== undefined)
          changes.children = visit(props.children as ReactNode);
        return cloneElement(element, changes);
      });
    return visit(children);
  }, [children, preference, config]);
}
export function DisplayPreferences() {
  const { preference, config, save } = usePreferences();
  const [draft, setDraft] = useState(preference),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setDraft(preference);
  }, [preference]);
  return (
    <LocalizedContent>
      <section className="preference-panel" aria-label="Cài đặt hiển thị">
        <form
          aria-label="Tùy chọn hiển thị"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            try {
              await save(draft);
              setMessage("Đã lưu tùy chọn.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Ngôn ngữ
            <select
              aria-label="Ngôn ngữ"
              value={draft.language}
              disabled={busy}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  language: e.target.value as Preference["language"],
                })
              }
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </label>
          <label>
            Khu vực
            <select
              aria-label="Khu vực"
              value={draft.region}
              disabled={busy}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  region: e.target.value as Preference["region"],
                })
              }
            >
              {Object.entries(regions).map(([code, r]) => (
                <option key={code} value={code}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tiền tệ
            <select
              aria-label="Tiền tệ"
              value={draft.currency}
              disabled={busy}
              onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
            >
              {config.rates
                .filter((r) => r.enabled)
                .map((r) => (
                  <option key={r.code}>{r.code}</option>
                ))}
            </select>
          </label>
          <button className="button small-button" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu tùy chọn"}
          </button>
          <p role="status">{message}</p>
          {error && <p role="alert">{error}</p>}
        </form>
        <p>
          {regions[preference.region].shipping
            ? "Chỉ hỗ trợ giao hàng tại Việt Nam."
            : "Khu vực này chỉ hỗ trợ xem sản phẩm; chưa nhận giao hàng."}
        </p>
        <p>Giá quy đổi chỉ để tham khảo. Thanh toán luôn bằng VND.</p>
        <small data-localize="off">
          1 USD ={" "}
          {config.rates
            .find((r) => r.code === "USD")
            ?.vndPerUnit.toLocaleString("vi-VN")}{" "}
          VND · {config.asOf} · {config.source}
        </small>
      </section>
    </LocalizedContent>
  );
}
