"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useI18n } from "@/components/providers";
import { PageHead, Status, energy, useApi } from "@/components/ui";

type Board = {
  users: { id: number; name_fa: string; name_en: string; city_fa: string; city_en: string; wh: number }[];
  cities: { city_fa: string; city_en: string; wh: number; members: number }[];
  me: number;
};
type Row = { key: string; name: string; sub: string; wh: number; me?: boolean };

const MEDALS = ["🥇", "🥈", "🥉"];
const AVATAR = ["#ff9f0a", "#ff5e3a", "#10b981", "#3b82f6", "#8b5cf6", "#f43f5e", "#14b8a6"];
const PODIUM_ORDER = [1, 0, 2]; // 2nd · 1st · 3rd

function Avatar({ name, i, size = 44 }: { name: string; i: number; size?: number }) {
  const c = AVATAR[i % AVATAR.length];
  return (
    <span className="grid flex-none place-items-center rounded-full font-black text-white" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, ${c}aa, ${c})` }}>
      {name[0]}
    </span>
  );
}

export default function Community() {
  const { t, fmt, lang } = useI18n();
  const { data, error, reload } = useApi<Board>("/api/leaderboard");
  const [tab, setTab] = useState<"users" | "cities">("users");
  if (!data) return <Status error={error} onRetry={reload} />;

  const fa = lang === "fa";
  const rows: Row[] =
    tab === "users"
      ? data.users.map((u) => ({ key: `u${u.id}`, name: u.id === data.me ? t.community.you : fa ? u.name_fa : u.name_en, sub: fa ? u.city_fa : u.city_en, wh: u.wh, me: u.id === data.me }))
      : data.cities.map((c) => ({ key: c.city_en, name: fa ? c.city_fa : c.city_en, sub: t.community.members.replace("{n}", fmt(c.members)), wh: c.wh }));
  const max = rows[0]?.wh || 1;
  const kwh = (wh: number) => {
    const [v, u, d] = energy(wh, t);
    return `${fmt(v, { maximumFractionDigits: d })} ${u}`;
  };

  return (
    <>
      <PageHead title={t.community.title} sub={t.community.sub}>
        <div className="glass inline-flex rounded-full p-1" role="tablist">
          {(["users", "cities"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`relative rounded-full px-5 py-2 text-sm font-semibold ${tab === k ? "" : "text-muted"}`}>
              {tab === k && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-[var(--pill-strong)]" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
              <span className="relative">{t.community[k]}</span>
            </button>
          ))}
        </div>
      </PageHead>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          {/* Podium */}
          <div className="grid grid-cols-3 items-end gap-3">
            {PODIUM_ORDER.map((i) => {
              const r = rows[i];
              if (!r) return <div key={i} />;
              return (
                <motion.div
                  key={r.key}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", bounce: 0.35, duration: 0.8, delay: 0.1 + (2 - i) * 0.08 }}
                  className={`card flex flex-col items-center p-3 text-center sm:p-5 ${i === 0 ? "pb-10 sm:pb-14" : i === 1 ? "pb-6 sm:pb-8" : ""} ${r.me ? "outline outline-2 outline-[#ff9f0a]" : ""}`}
                >
                  <span className="text-3xl sm:text-4xl">{MEDALS[i]}</span>
                  <div className="mt-2"><Avatar name={r.name} i={i} size={i === 0 ? 64 : 52} /></div>
                  <div className="mt-2 w-full truncate font-extrabold">{r.name}</div>
                  <div className="w-full truncate text-xs text-muted">{r.sub}</div>
                  <div className={`chip mt-3 !whitespace-normal !px-2 text-center !text-[11px] sm:!text-xs ${i === 0 ? "chip-sun" : ""}`}>{kwh(r.wh)}</div>
                </motion.div>
              );
            })}
          </div>

          {/* The rest */}
          <ol className="card mt-4 divide-y divide-[var(--line)] overflow-hidden">
            {rows.slice(3).map((r, i) => (
              <motion.li
                key={r.key}
                initial={{ opacity: 0, x: fa ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", bounce: 0, duration: 0.6, delay: 0.2 + i * 0.03 }}
                className={`flex items-center gap-3 p-4 ${r.me ? "bg-[#ff9f0a1f]" : ""}`}
              >
                <span className="w-7 text-center font-black text-muted">{fmt(i + 4)}</span>
                <Avatar name={r.name} i={i + 3} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold">
                    <span className="truncate">{r.name}</span>
                    {r.me && <span className="chip chip-sun !py-0.5 !text-[10px]">{t.community.you}</span>}
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--pill-strong)]">
                    <motion.div className="bar-sun h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(r.wh / max) * 100}%` }} transition={{ type: "spring", bounce: 0, duration: 1, delay: 0.3 + i * 0.03 }} />
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-sm font-extrabold tabular-nums">{kwh(r.wh)}</div>
                  <div className="text-xs text-muted">{r.sub}</div>
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
