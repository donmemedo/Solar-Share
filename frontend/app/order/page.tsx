"use client";
import { Check, Minus, Plus } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/components/providers";
import { Field, Num, PHONE_RE, PageHead, Reveal, Status, cityOptions, cleanPhone, send, useApi, type Me } from "@/components/ui";
import { KITS } from "@/lib/i18n";

type KitId = (typeof KITS)[number]["id"];
type Form = { name: string; phone: string; city: string; address: string };

export default function Order() {
  const { t, fmt, lang } = useI18n();
  const me = useApi<Me>("/api/me"); // login required; also pre-fills contact details
  const [kit, setKit] = useState<KitId>("pro");
  const [qty, setQty] = useState(1);
  const [f, setF] = useState<Form | null>(null);
  const [err, setErr] = useState<Partial<Record<keyof Form | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; total: number } | null>(null);

  useEffect(() => {
    const m = KITS.find((k) => k.id === new URLSearchParams(location.search).get("kit"));
    if (m) (setKit(m.id), setQty(m.min));
  }, []);

  if (!me.data) return <Status error={me.error} onRetry={me.reload} />;
  const form = f ?? { name: lang === "fa" ? me.data.name_fa : me.data.name_en, phone: me.data.phone, city: me.data.city_en, address: "" };
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...form, [k]: e.target.value });
  const idx = KITS.findIndex((k) => k.id === kit);
  const meta = KITS[idx];
  const pick = (id: KitId) => {
    const m = KITS.find((k) => k.id === id)!;
    setKit(id);
    setQty((q) => Math.min(Math.max(q, m.min), m.max));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    const phone = cleanPhone(form.phone);
    const x: typeof err = {};
    if (form.name.trim().length < 2) x.name = t.auth.required;
    if (!PHONE_RE.test(phone)) x.phone = phone ? t.auth.badPhone : t.auth.required;
    if (form.address.trim().length < 10) x.address = form.address.trim() ? t.order.shortAddress : t.auth.required;
    setErr(x);
    if (Object.keys(x).length) return;
    setBusy(true);
    try {
      setDone(await send("/api/orders", { kit, qty, ...form, phone }));
    } catch {
      setErr({ form: t.auth.invalid });
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.3 }} className="card mx-auto max-w-md p-8 text-center">
        <motion.span initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.5, delay: 0.15 }} className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-500 text-white">
          <Check size={40} strokeWidth={3} />
        </motion.span>
        <h1 className="mt-5 text-3xl font-black">{t.order.done}</h1>
        <p className="mt-2 text-muted">{t.order.doneSub}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-[var(--pill)] p-4 text-sm">
          <div>
            <div className="text-muted">{t.order.number}</div>
            <div className="text-lg font-black">#{fmt(done.id, { useGrouping: false })}</div>
          </div>
          <div>
            <div className="text-muted">{t.order.total}</div>
            <div className="text-lg font-black">{fmt(done.total)} {t.units.toman}</div>
          </div>
        </div>
        <Link href="/account" className="btn btn-sun mt-6 w-full">{t.order.viewOrders}</Link>
      </motion.div>
    );

  return (
    <>
      <PageHead title={t.order.title} sub={t.order.sub} />
      <form noValidate onSubmit={submit} className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-4">
          <Reveal className="card p-6">
            <h2 className="mb-4 font-bold">{t.order.kit}</h2>
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t.order.kit}>
              {KITS.map((k, i) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={kit === k.id}
                  onClick={() => pick(k.id)}
                  className={`relative rounded-2xl border-2 p-4 text-start transition-colors ${kit === k.id ? "border-[#ff9f0a] bg-[#ff9f0a14]" : "border-transparent bg-[var(--pill)]"}`}
                >
                  {kit === k.id && (
                    <motion.span layoutId="kit-check" className="absolute end-3 top-3 grid size-6 place-items-center rounded-full text-[#1d1000]" style={{ background: "var(--sun)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}>
                      <Check size={14} strokeWidth={3} />
                    </motion.span>
                  )}
                  <div className="pe-7 font-bold">{t.kits.items[i].name}</div>
                  <div className="mt-1 text-sm text-muted">
                    {fmt(k.price / 1e6)} {t.units.mToman}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="font-semibold">
                {t.order.qty} <span className="text-xs text-muted">({fmt(meta.min)} {t.order.to} {fmt(meta.max)})</span>
              </span>
              <div className="flex items-center gap-1 rounded-full bg-[var(--pill)] p-1">
                <button type="button" className="icon-btn disabled:opacity-40" onClick={() => setQty((q) => Math.max(meta.min, q - 1))} disabled={qty <= meta.min} aria-label={`${t.order.qty} −`}>
                  <Minus size={16} />
                </button>
                <span className="w-10 text-center text-lg font-black tabular-nums" aria-live="polite">{fmt(qty)}</span>
                <button type="button" className="icon-btn disabled:opacity-40" onClick={() => setQty((q) => Math.min(meta.max, q + 1))} disabled={qty >= meta.max} aria-label={`${t.order.qty} +`}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05} className="card grid gap-4 p-6 sm:grid-cols-2">
            <h2 className="font-bold sm:col-span-2">{t.order.details}</h2>
            <Field label={t.auth.name} error={err.name}>
              <input className="field" value={form.name} onChange={set("name")} autoComplete="name" aria-invalid={!!err.name} />
            </Field>
            <Field label={t.auth.phone} error={err.phone}>
              <input className="field rtl:text-right" dir="ltr" inputMode="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} aria-invalid={!!err.phone} />
            </Field>
            <Field label={t.auth.city}>
              <select className="field" value={form.city} onChange={set("city")}>{cityOptions(t)}</select>
            </Field>
            <div className="sm:col-span-2">
              <Field label={t.order.address} error={err.address}>
                <textarea className="field resize-y" rows={3} placeholder={t.order.addressHint} value={form.address} onChange={set("address")} autoComplete="street-address" aria-invalid={!!err.address} />
              </Field>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="card h-fit p-6 lg:sticky lg:top-28">
          <div className="flex justify-between gap-3 text-sm">
            <span>
              {t.kits.items[idx].name} × {fmt(qty)}
            </span>
            <span className="text-muted">
              {fmt(meta.price)} {t.units.toman}
            </span>
          </div>
          <div className="my-4 border-t border-dashed border-[var(--line-strong)]" />
          <div className="text-sm text-muted">{t.order.total}</div>
          <div className="text-3xl font-black tracking-tight">
            <Num value={meta.price * qty} /> <span className="text-base font-bold text-muted">{t.units.toman}</span>
          </div>
          <p className="mt-3 text-xs leading-6 text-muted">{t.order.doneSub}</p>
          {err.form && <p role="alert" className="mt-3 rounded-2xl bg-[#ff453a1a] p-3 text-sm font-semibold text-[#ff453a]">{err.form}</p>}
          <button className="btn btn-sun mt-5 w-full" disabled={busy}>{t.order.submit}</button>
        </Reveal>
      </form>
    </>
  );
}
