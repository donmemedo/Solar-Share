"use client";
import { Copy, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/components/providers";
import { Field, Num, Reveal, Status, cityOptions, energy, send, useApi, useToast, type Me } from "@/components/ui";
import { KITS } from "@/lib/i18n";

type Order = { id: number; kit: string; qty: number; total: number; city: string; address: string; status: string; at: string };
type Redemption = { id: number; code: string; at: string; title_fa: string; title_en: string; emoji: string; category: string; cost: number };
type Profile = Me & { orders: Order[]; redemptions: Redemption[] };

export default function Account() {
  const { t, fmt, lang } = useI18n();
  const { data, setData, error, reload } = useApi<Profile>("/api/me");
  const toast = useToast();
  const [form, setForm] = useState<{ name: string; city: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!data) return <Status error={error} onRetry={reload} />;

  const d = data;
  const fa = lang === "fa";
  const name = fa ? d.name_fa : d.name_en;
  const f = form ?? { name, city: d.city_en };
  const date = new Intl.DateTimeFormat(fa ? "fa-IR" : "en-US", { dateStyle: "medium" });
  const [ev, eu, ed] = energy(d.wh, t);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (f.name.trim().length < 2) return toast.show(t.auth.required);
    setBusy(true);
    try {
      setData({ ...d, ...(await send<Me>("/api/me", f, "PATCH")) });
      setForm(null);
      toast.show(t.account.saved);
    } catch {
      toast.show(t.auth.invalid);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await send("/api/auth/logout").catch(() => {});
    location.href = "/";
  }

  return (
    <>
      {toast.node}
      <Reveal className="card p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid size-20 flex-none place-items-center rounded-full text-3xl font-black text-[#1d1000]" style={{ background: "var(--sun)" }}>
            {name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-3xl font-black tracking-tight">{name}</h1>
            <p className="mt-1 text-muted">
              <span dir="ltr">{fa ? d.phone.replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[+x]) : d.phone}</span> · {fa ? d.city_fa : d.city_en}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t.account.since} {date.format(new Date(d.created))}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut size={18} className="ltr:rotate-180" /> {t.account.logout}
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            [t.dash.balance, <Num key="c" value={d.credits} />, t.units.credits],
            [t.dash.total, <Num key="e" value={ev} decimals={ed} />, eu],
            [t.dash.rank, <>#{fmt(d.rank)}</>, ""],
          ].map(([label, value, unit], i) => (
            <div key={i} className="rounded-2xl bg-[var(--pill)] p-3 sm:p-4">
              <div className="truncate text-xs text-muted">{label}</div>
              <div className="mt-1 text-xl font-black sm:text-2xl">
                {value} <span className="text-xs font-bold text-muted">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Reveal delay={0.05} className="card p-6">
          <h2 className="mb-4 font-bold">{t.account.edit}</h2>
          <form onSubmit={save} className="grid gap-4">
            <Field label={t.auth.name}>
              <input className="field" value={f.name} onChange={(e) => setForm({ ...f, name: e.target.value })} autoComplete="name" />
            </Field>
            <Field label={t.auth.city}>
              <select className="field" value={f.city} onChange={(e) => setForm({ ...f, city: e.target.value })}>{cityOptions(t)}</select>
            </Field>
            <button className="btn btn-sun" disabled={busy || !form}>{t.account.save}</button>
          </form>
        </Reveal>

        <Reveal delay={0.1} className="card p-6 lg:col-span-2">
          <h2 className="mb-4 font-bold">{t.account.orders}</h2>
          {d.orders.length ? (
            <ul className="grid gap-3">
              {d.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--pill)] p-4">
                  <span className="grid size-12 flex-none place-items-center rounded-xl text-2xl" style={{ background: "var(--sun)" }}>☀️</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {t.kits.items[KITS.findIndex((k) => k.id === o.kit)]?.name} × {fmt(o.qty)}
                    </div>
                    <div className="text-xs text-muted">
                      {t.account.order} #{fmt(o.id, { useGrouping: false })} · {date.format(new Date(o.at))}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="font-extrabold">
                      {fmt(o.total)} {t.units.toman}
                    </div>
                    <span className="chip mt-1">{t.account.status[o.status] ?? o.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid place-items-center gap-4 py-8 text-center text-muted">
              {t.account.noOrders}
              <Link href="/#kits" className="btn btn-sun">{t.kits.order}</Link>
            </div>
          )}
        </Reveal>

        <Reveal delay={0.15} className="card p-6 lg:col-span-3">
          <h2 className="mb-4 font-bold">{t.account.rewards}</h2>
          {d.redemptions.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {d.redemptions.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-[var(--pill)] p-3">
                  <span className={`tile tile-${r.category} !size-12 !text-2xl`}>{r.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{fa ? r.title_fa : r.title_en}</div>
                    <div dir="ltr" className="font-mono text-sm font-bold tracking-widest rtl:text-right">{r.code}</div>
                    <div className="text-xs text-muted">{date.format(new Date(r.at))}</div>
                  </div>
                  <button className="icon-btn" aria-label={t.market.copy} onClick={() => navigator.clipboard?.writeText(r.code).then(() => toast.show(t.market.copied))}>
                    <Copy size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid place-items-center gap-4 py-8 text-center text-muted">
              {t.account.noRewards}
              <Link href="/market" className="btn btn-ghost">{t.market.title}</Link>
            </div>
          )}
        </Reveal>
      </div>
    </>
  );
}
