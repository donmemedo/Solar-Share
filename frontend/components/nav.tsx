"use client";
import { Home, LayoutGrid, LogIn, Monitor, Moon, ShoppingBag, Sun, User, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n, type Theme } from "./providers";

const LINKS = [
  ["/", "home", Home],
  ["/dashboard", "dashboard", LayoutGrid],
  ["/market", "market", ShoppingBag],
  ["/community", "community", Users],
] as const;
const NEXT_THEME: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon };
const pill = { type: "spring", bounce: 0.2, duration: 0.5 } as const;

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }} aria-hidden>
      <span className="spin absolute inset-0 rounded-full bg-[conic-gradient(#ffd60a,#ff9f0a,#ff5e3a,#ffd60a)] opacity-80 blur-[2px]" />
      <span className="absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_35%_30%,#fffbea,#ffb300_55%,#ff6a00)]" />
    </span>
  );
}

export function Nav() {
  const path = usePathname();
  const { t, lang, setLang, theme, setTheme, authed } = useI18n();
  const ThemeIcon = THEME_ICON[theme];
  const account = authed ? (["/account", "account", User] as const) : (["/login", "login", LogIn] as const);
  const AccountIcon = account[2];
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <nav className="glass flex w-full max-w-3xl items-center justify-between gap-1 rounded-full p-1.5">
          <Link href="/" className="flex items-center gap-2 pe-3 ps-1.5 text-lg font-extrabold tracking-tight">
            <Logo />
            {t.brand}
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map(([href, key]) => (
              <Link key={href} href={href} className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${path === href ? "" : "text-muted hover:text-fg"}`}>
                {path === href && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-[var(--pill-strong)]" transition={pill} />}
                <span className="relative">{t.nav[key]}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center">
            <Link href={account[0]} className={`icon-btn hidden md:grid ${path === account[0] ? "bg-[var(--pill-strong)]" : ""}`} aria-label={t.nav[account[1]]} title={t.nav[account[1]]}>
              <AccountIcon size={18} />
            </Link>
            <button onClick={(e) => setLang(lang === "fa" ? "en" : "fa", e)} className="icon-btn text-sm font-extrabold" aria-label={t.langLabel} title={t.langLabel}>
              {lang === "fa" ? "EN" : "فا"}
            </button>
            <button onClick={(e) => setTheme(NEXT_THEME[theme], e)} className="icon-btn overflow-hidden" aria-label={`${t.theme.label}: ${t.theme[theme]}`} title={`${t.theme.label}: ${t.theme[theme]}`}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, scale: 0 }} animate={{ rotate: 0, scale: 1 }} exit={{ rotate: 90, scale: 0 }} transition={pill}>
                  <ThemeIcon size={18} />
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* iOS-style floating tab bar on phones */}
      <nav className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[28px] p-1.5 md:hidden">
        {[...LINKS, account].map(([href, key, Icon]) => {
          const on = path === href;
          return (
            <Link key={href} href={href} className={`relative flex flex-col items-center gap-0.5 rounded-[22px] py-2 text-[11px] font-semibold ${on ? "" : "text-muted"}`}>
              {on && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-[22px] bg-[var(--pill-strong)]" transition={pill} />}
              <Icon size={21} strokeWidth={on ? 2.4 : 1.8} className="relative" />
              <span className="relative">{t.nav[key]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
