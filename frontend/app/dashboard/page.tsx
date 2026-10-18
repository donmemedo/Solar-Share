"use client";
import { Car, Leaf, RefreshCw, Share2, Smartphone, TreePine } from "lucide-react";
import { motion, useSpring } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/nav";
import { useI18n } from "@/components/providers";
import { Num, PageHead, Reveal, Status, energy, send, useApi, useToast, type Me, type Overview } from "@/components/ui";

const DAILY_GOAL = 200; // Wh
const CO2_PER_TREE_KG = 21;
const CO2_PER_KM_KG = 0.12;
const WH_PER_PHONE = 12;

function Wallet({ me }: { me: Me }) {
  const { t, fmt } = useI18n();
  const rx = useSpring(0, { stiffness: 160, damping: 16 });
  const ry = useSpring(0, { stiffness: 160, damping: 16 });
  const [tv, tu, td] = energy(me.wh, t);
  return (
    <motion.div
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 14);
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 14);
      }}
      onPointerLeave={() => (rx.set(0), ry.set(0))}
      className="wallet relative flex min-h-60 flex-col overflow-hidden rounded-[30px] p-6 md:p-7"
    >
      <div className="flex items-center justify-between">
        <span className="font-bold opacity-80">{t.dash.wallet}</span>
        <Logo size={36} />
      </div>
      <div className="mt-auto pt-8 text-sm font-semibold opacity-70">{t.dash.balance}</div>
      <div className="text-5xl font-black tracking-tight md:text-6xl">
        <Num value={me.credits} /> <span className="text-lg font-bold opacity-70">{t.units.credits}</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/25 p-3 text-sm backdrop-blur">
        {[
          [t.dash.total, `${fmt(tv, { maximumFractionDigits: td })} ${tu}`],
          [t.dash.co2, `${fmt(me.co2_kg, { maximumFractionDigits: 1 })} ${t.units.kg}`],
          [t.dash.rank, `#${fmt(me.rank)}`],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <div className="truncate text-xs opacity-70">{k}</div>
            <div className="font-extrabold leading-tight">{v}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function Ring({ value }: { value: number }) {
  const { t, fmt } = useI18n();
  return (
    <div className="relative grid place-items-center">
      <svg viewBox="0 0 120 120" className="size-44 -rotate-90">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd60a" />
            <stop offset="1" stopColor="#ff5e3a" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--pill-strong)" strokeWidth="11" />
        <motion.circle
          cx="60" cy="60" r="50" fill="none" stroke="url(#ring)" strokeWidth="11" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.min(value / DAILY_GOAL, 1) }}
          transition={{ type: "spring", bounce: 0, duration: 1.6 }}
          style={{ filter: "drop-shadow(0 0 6px rgb(255 140 0 / .6))" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-black"><Num value={value} /></div>
        <div className="text-xs text-muted">{t.units.wh} / {fmt(DAILY_GOAL)}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, fmt, lang } = useI18n();
  const { data, error, reload } = useApi<Overview>("/api/overview");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!data) return <Status error={error} onRetry={reload} />;
  const { me, week, challenges } = data;
  const today = week.at(-1)?.wh ?? 0;
  const max = Math.max(...week.map((d) => d.wh), 1);
  const day = new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", { weekday: lang === "fa" ? "narrow" : "short" });

  async function sync() {
    setBusy(true);
    try {
      const r = await send<{ added: number }>("/api/sync");
      await reload();
      toast.show(`☀️ ${t.dash.added.replace("{n}", fmt(r.added))}`);
    } catch {
      toast.show(t.error);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const text = t.dash.shareText.replace("{n}", fmt(me.co2_kg, { maximumFractionDigits: 1 }));
    try {
      if (navigator.share) return await navigator.share({ title: t.brand, text, url: location.origin });
      await navigator.clipboard.writeText(`${text} ${location.origin}`);
      toast.show(t.dash.copied);
    } catch {} // user closed the share sheet
  }

  return (
    <>
      {toast.node}
      <PageHead title={`${t.dash.hello.replace("{name}", lang === "fa" ? me.name_fa : me.name_en)} 👋`} sub={t.dash.sub}>
        <div className="flex gap-2">
        <button className="btn btn-ghost" onClick={share} aria-label={t.dash.share}>
          <Share2 size={18} />
          <span className="hidden sm:inline">{t.dash.share}</span>
        </button>
        <button className="btn btn-sun" onClick={sync} disabled={busy}>
          <RefreshCw size={18} className={busy ? "spin" : ""} style={{ animationDuration: "1s" }} />
          {busy ? t.dash.syncing : t.dash.sync}
        </button>
        </div>
      </PageHead>

      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2"><Wallet me={me} /></Reveal>
        <Reveal delay={0.1} className="card flex flex-col items-center justify-center gap-3 p-6">
          <div className="self-start font-bold">{t.dash.today}</div>
          <Ring value={today} />
          <div className="text-sm text-muted">{t.dash.goal}: {fmt(DAILY_GOAL)} {t.units.wh}</div>
        </Reveal>

        <Reveal delay={0.15} className="card p-6 lg:col-span-2">
          <div className="mb-4 font-bold">{t.dash.week}</div>
          <div className="flex h-48 items-stretch gap-2 sm:gap-3">
            {week.map((d, i) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] tabular-nums text-muted sm:text-xs">{fmt(d.wh)}</span>
                <div className="flex w-full flex-1 items-end">
                  <motion.div
                    className={`w-full rounded-xl ${i === week.length - 1 ? "bar-sun" : "bg-[var(--pill-strong)]"}`}
                    style={{ height: `${Math.max((d.wh / max) * 100, 3)}%`, originY: 1 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: "spring", bounce: 0.3, duration: 0.9, delay: i * 0.05 }}
                  />
                </div>
                <span className="text-xs font-semibold text-muted">{day.format(new Date(`${d.day}T12:00:00`))}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.2} className="card p-6">
          <div className="mb-4 flex items-center gap-2 font-bold"><Leaf size={18} className="text-emerald-500" />{t.dash.impact}</div>
          <div className="grid gap-3">
            {[
              [TreePine, me.co2_kg / CO2_PER_TREE_KG, 1, t.dash.trees],
              [Car, me.co2_kg / CO2_PER_KM_KG, 0, t.dash.km],
              [Smartphone, me.wh / WH_PER_PHONE, 0, t.dash.charges],
            ].map(([Icon, v, d, label], i) => {
              const I = Icon as typeof Car;
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-[var(--pill)] p-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-500"><I size={20} /></span>
                  <div>
                    <div className="text-xl font-black"><Num value={v as number} decimals={d as number} /></div>
                    <div className="text-xs text-muted">{label as string}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.25} className="card p-6 lg:col-span-3">
          <div className="mb-4 font-bold">{t.dash.challenges}</div>
          <div className="grid gap-4 md:grid-cols-3">
            {challenges.map((c) => {
              const p = Math.min(c.value / c.goal, 1);
              const [title, desc] = t.dash.ch[c.id];
              return (
                <div key={c.id} className="rounded-2xl bg-[var(--pill)] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{title}</span>
                    <span className={`chip ${p >= 1 ? "chip-sun" : ""}`}>{fmt(p, { style: "percent" })}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{desc}</p>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--pill-strong)]">
                    <motion.div className="bar-sun h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${p * 100}%` }} transition={{ type: "spring", bounce: 0, duration: 1.2 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </>
  );
}
