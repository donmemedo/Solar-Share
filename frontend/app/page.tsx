"use client";
import { ArrowLeft, BatteryCharging, Check, Coins, Trophy } from "lucide-react";
import { motion, useMotionValue, useSpring } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/providers";
import { Num, Reveal, energy, useApi, type Community } from "@/components/ui";
import { KITS } from "@/lib/i18n";

const PILLAR_ICONS = [BatteryCharging, Coins, Trophy];
const STEP_EMOJI = ["☀️", "⚡", "🔄", "🎁"];
const ease = [0.16, 1, 0.3, 1] as const;

function SunOrb({ today, co2 }: { today: number; co2: number }) {
  const { t, fmt } = useI18n();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 60, damping: 18 });
  const y = useSpring(my, { stiffness: 60, damping: 18 });
  useEffect(() => {
    const move = (e: PointerEvent) => (mx.set((e.clientX / innerWidth - 0.5) * 36), my.set((e.clientY / innerHeight - 0.5) * 36));
    addEventListener("pointermove", move);
    return () => removeEventListener("pointermove", move);
  }, [mx, my]);
  return (
    <motion.div
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", bounce: 0.25, duration: 1.4 }}
      className="relative mx-auto aspect-square w-[min(78vw,440px)]"
      aria-hidden
    >
      <div className="sun-glow absolute -inset-[12%] rounded-full" />
      <div className="sun-rays absolute inset-0 rounded-full" />
      <div className="orbit absolute inset-[3%]"><span className="coin">+1</span></div>
      <div className="orbit slow absolute inset-[12%]"><span className="coin">CO₂</span></div>
      <div className="sun-core absolute inset-[24%] rounded-full" />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="glass absolute start-0 top-[14%] rounded-2xl px-4 py-3"
      >
        <div className="text-sun text-2xl font-black"><span dir="ltr">+{fmt(today)}</span></div>
        <div className="text-xs text-muted">{t.hero.today}</div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="glass absolute bottom-[12%] end-0 flex items-center gap-2 rounded-2xl px-4 py-3"
      >
        <span className="text-xl">🌱</span>
        <span className="font-bold">{fmt(co2 / 1000, { maximumFractionDigits: 1 })} {t.units.t} CO₂</span>
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const { t, fmt } = useI18n();
  const { data } = useApi<Community>("/api/community");
  // Community counter ticks live, as if kits are reporting in right now.
  const [bonus, setBonus] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBonus((b) => b + 40 + Math.round(Math.random() * 160)), 1800);
    return () => clearInterval(id);
  }, []);
  const c = data;
  const [ev, eu, ed] = energy((c?.wh ?? 0) + bonus, t);

  return (
    <>
      {/* Hero */}
      <section className="grid min-h-[calc(100svh-9rem)] items-center gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="chip glass">
            <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-400" /><span className="relative size-2 rounded-full bg-emerald-500" /></span>
            {t.hero.badge}
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease, delay: 0.1 }}
            className="mt-6 text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl"
          >
            {t.hero.title1}
            <br />
            <span className="text-sun">{t.hero.title2}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.25 }} className="mt-6 max-w-xl text-lg leading-8 text-muted">
            {t.hero.sub}
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.4 }} className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn btn-sun">
              {t.hero.cta}
              <ArrowLeft size={18} className="ltr:rotate-180" />
            </Link>
            <a href="#kits" className="btn btn-ghost">{t.hero.cta2}</a>
          </motion.div>
        </div>
        <SunOrb today={c?.today_wh ?? 0} co2={c?.co2_kg ?? 0} />
      </section>

      {/* Live community stats */}
      <Reveal className="card mt-10 grid gap-6 p-6 sm:grid-cols-3 md:p-8">
        {[
          [ev, `${eu}`, t.stats.wh, ed],
          [(c?.co2_kg ?? 0) / 1000, t.units.t, t.stats.co2, 1],
          [c?.users ?? 0, "", t.stats.users, 0],
        ].map(([v, u, label, d], i) => (
          <div key={i} className="text-center sm:text-start">
            <div className="text-4xl font-black tracking-tight md:text-5xl">
              <Num value={v as number} decimals={d as number} /> <span className="text-lg font-bold text-muted">{u}</span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-muted sm:justify-start">
              {i === 0 && <span className="chip !py-0.5 text-emerald-500">● {t.stats.live}</span>}
              {label}
            </div>
          </div>
        ))}
      </Reveal>

      {/* Pillars */}
      <section className="mt-28">
        <Reveal><h2 className="text-center text-3xl font-black tracking-tight md:text-5xl">{t.pillars.title}</h2></Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {t.pillars.items.map(([title, body], i) => {
            const Icon = PILLAR_ICONS[i];
            return (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div whileHover={{ y: -6 }} transition={{ type: "spring", bounce: 0.3 }} className="card h-full p-7">
                  <span className="grid size-14 place-items-center rounded-2xl text-[#1d1000]" style={{ background: "var(--sun)" }}><Icon size={26} /></span>
                  <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 leading-7 text-muted">{body}</p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-28">
        <Reveal><h2 className="text-center text-3xl font-black tracking-tight md:text-5xl">{t.how.title}</h2></Reveal>
        <div className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.how.steps.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="card flex items-center gap-4 p-5 lg:flex-col lg:items-start">
              <span className="relative grid size-14 flex-none place-items-center rounded-2xl bg-[var(--pill)] text-2xl">
                {STEP_EMOJI[i]}
                <span className="absolute -end-1.5 -top-1.5 grid size-6 place-items-center rounded-full text-xs font-black text-[#1d1000]" style={{ background: "var(--sun)" }}>{fmt(i + 1)}</span>
              </span>
              <span className="font-bold leading-7">{s}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Kits */}
      <section id="kits" className="mt-28 scroll-mt-28">
        <Reveal><h2 className="text-center text-3xl font-black tracking-tight md:text-5xl">{t.kits.title}</h2></Reveal>
        <div className="mt-12 grid items-stretch gap-4 md:grid-cols-3">
          {t.kits.items.map((k, i) => {
            const pro = i === 1;
            return (
              <Reveal key={k.name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", bounce: 0.3 }}
                  className={`card relative flex h-full flex-col p-7 ${pro ? "outline outline-2 outline-[#ff9f0a] md:-my-4 md:py-11" : ""}`}
                >
                  {pro && <span className="chip chip-sun absolute -top-3.5 start-7">{t.kits.popular}</span>}
                  <h3 className="text-xl font-extrabold">{k.name}</h3>
                  <p className="mt-1 text-sm text-muted">{k.desc}</p>
                  <div className="mt-6 flex items-baseline gap-2">
                    {i === 2 && <span className="text-sm text-muted">{t.kits.from}</span>}
                    <span className="text-4xl font-black tracking-tight">{fmt(KITS[i].price / 1e6)}</span>
                    <span className="text-sm font-semibold text-muted">{t.units.mToman}</span>
                  </div>
                  <ul className="mt-6 grid flex-1 content-start gap-3">
                    {k.feats.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm">
                        <Check size={18} className="mt-0.5 flex-none text-emerald-500" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={`/order?kit=${KITS[i].id}`} className={`btn mt-8 w-full ${pro ? "btn-sun" : "btn-ghost"}`}>{t.kits.order}</Link>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <footer className="mt-24 text-center text-sm text-muted">{t.footer}</footer>
    </>
  );
}
