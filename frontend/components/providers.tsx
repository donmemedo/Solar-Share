"use client";
import { MotionConfig } from "motion/react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { dicts, type Dict, type Lang } from "@/lib/i18n";

export type Theme = "system" | "light" | "dark";
type Origin = { clientX: number; clientY: number };
type Ctx = {
  authed: boolean;
  lang: Lang;
  t: Dict;
  fmt: (n: number, o?: Intl.NumberFormatOptions) => string;
  setLang: (l: Lang, from?: Origin) => void;
  theme: Theme;
  setTheme: (t: Theme, from?: Origin) => void;
};

const I18n = createContext<Ctx | null>(null);
export const useI18n = () => useContext(I18n)!;

const save = (k: string, v: string) => (document.cookie = `${k}=${v};path=/;max-age=31536000;samesite=lax`);

// Circular reveal from the tapped control (View Transitions API); plain swap where unsupported.
function reveal(apply: () => void, from?: Origin) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
  const s = document.documentElement.style;
  s.setProperty("--vt-x", `${from?.clientX ?? innerWidth / 2}px`);
  s.setProperty("--vt-y", `${from?.clientY ?? 0}px`);
  doc.startViewTransition(() => flushSync(apply));
}

export function Providers({ children, authed, lang: initLang, theme: initTheme }: { children: ReactNode; authed: boolean; lang: Lang; theme: Theme }) {
  const [lang, setLangState] = useState(initLang);
  const [theme, setThemeState] = useState(initTheme);
  const locale = lang === "fa" ? "fa-IR" : "en-US";

  const value: Ctx = {
    authed,
    lang,
    t: dicts[lang],
    fmt: (n, o) => new Intl.NumberFormat(locale, o).format(n),
    setLang: (l, from) =>
      reveal(() => {
        const el = document.documentElement;
        el.lang = l;
        el.dir = l === "fa" ? "rtl" : "ltr";
        save("lang", l);
        setLangState(l);
      }, from),
    theme,
    setTheme: (t, from) =>
      reveal(() => {
        if (t === "system") delete document.documentElement.dataset.theme;
        else document.documentElement.dataset.theme = t;
        save("theme", t);
        setThemeState(t);
      }, from),
  };

  return (
    <I18n.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </I18n.Provider>
  );
}
