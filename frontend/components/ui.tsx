"use client";
import { AnimatePresence, animate, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Dict } from "@/lib/i18n";
import { useI18n } from "./providers";

export type Me = { id: number; name_fa: string; name_en: string; city_fa: string; city_en: string; wh: number; credits: number; co2_kg: number; rank: number; phone: string; created: string };
export type Overview = { me: Me; week: { day: string; wh: number }[]; challenges: { id: string; goal: number; value: number }[] };
export type Community = { users: number; wh: number; co2_kg: number; today_wh: number };

/** Send the visitor to log in, then back here. */
export function goLogin() {
  location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
}

/** Persian/Arabic digits → ASCII, so phone fields accept whatever keyboard the user has. */
export const toEn = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/** GET JSON; pass null to skip. A 401 means the page needs a login. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      const r = await fetch(path, { cache: "no-store" });
      if (r.status === 401) return goLogin();
      if (!r.ok) throw new Error();
      setData(await r.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, [path]);
  useEffect(() => void reload(), [reload]);
  return { data, setData, error, reload };
}

/** POST/PATCH JSON. Throws Error(detail) where detail is the API's error code, or "invalid" for validation errors. */
export async function send<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const r = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const res = await r.json().catch(() => ({}));
  if (r.status === 401 && res.detail === "not_authenticated") goLogin();
  if (!r.ok) throw new Error(typeof res.detail === "string" ? res.detail : "invalid");
  return res;
}

/** Wh → the friendliest unit. */
export function energy(wh: number, t: Dict): [number, string, number] {
  if (wh >= 1e6) return [wh / 1e6, t.units.mwh, 1];
  if (wh >= 1e3) return [wh / 1e3, t.units.kwh, 1];
  return [wh, t.units.wh, 0];
}

/** Number that counts from its previous value to the new one. */
export function Num({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const { fmt } = useI18n();
  const last = useRef(0);
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(last.current, value, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => ((last.current = x), setV(x)) });
    return () => c.stop();
  }, [value]);
  return <span className="tabular-nums">{fmt(v, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}

export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = (m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  };
  const node = (
    <AnimatePresence>
      {msg && (
        <motion.div
          key={msg}
          role="status"
          initial={{ y: -30, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -30, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className="glass fixed inset-x-0 top-20 z-50 mx-auto w-fit max-w-[90vw] rounded-full px-5 py-3 text-sm font-semibold"
        >
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { show, node };
}

/** Bottom sheet on phones, centered card on desktop. Drag down or flick to dismiss. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            className="sheet relative w-full rounded-t-[32px] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:max-w-md md:rounded-[32px]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0.12, duration: 0.45 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.8 }}
            onDragEnd={(_, i) => (i.offset.y > 110 || i.velocity.y > 600) && onClose()}
          >
            <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-[var(--line-strong)] md:hidden" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Status({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  if (!error)
    return (
      <div className="grid gap-4 md:grid-cols-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-48" />
        ))}
      </div>
    );
  return (
    <div className="card mx-auto grid max-w-sm place-items-center gap-4 p-8 text-center">
      <span className="text-4xl">🌥️</span>
      <p className="font-semibold">{t.error}</p>
      <button className="btn btn-sun" onClick={onRetry}>
        {t.retry}
      </button>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub: string; children?: ReactNode }) {
  return (
    <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-2 text-muted">{sub}</p>
      </div>
      {children}
    </Reveal>
  );
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      {label}
      {children}
      {error && (
        <span role="alert" className="text-xs font-medium text-[#ff453a]">
          {error}
        </span>
      )}
    </label>
  );
}

export const cityOptions = (t: Dict) =>
  Object.entries(t.cities).map(([k, v]) => (
    <option key={k} value={k}>
      {v}
    </option>
  ));

export const PHONE_RE = /^09\d{9}$/;
export const cleanPhone = (s: string) => toEn(s).replace(/[\s-]/g, "");
