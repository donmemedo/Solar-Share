"use client";
import { Check, Copy, LogIn, Search } from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { useI18n } from "@/components/providers";
import { Num, PageHead, Sheet, Status, send, useApi, useToast, type Me } from "@/components/ui";

type Reward = { id: number; title_fa: string; title_en: string; partner_fa: string; partner_en: string; cost: number; category: string; emoji: string };

export default function Market() {
  const { t, fmt, lang, authed } = useI18n();
  const rewards = useApi<Reward[]>("/api/rewards");
  const me = useApi<Me>(authed ? "/api/me" : null);
  const toast = useToast();
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Reward | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setSel(null), []);

  if (!rewards.data) return <Status error={rewards.error} onRetry={rewards.reload} />;
  const credits = me.data?.credits ?? 0;
  const L = (r: Reward) => (lang === "fa" ? [r.title_fa, r.partner_fa] : [r.title_en, r.partner_en]);
  const needle = q.trim().toLowerCase();
  const list = rewards.data.filter(
    (r) => (cat === "all" || r.category === cat) && (!needle || `${r.title_fa} ${r.title_en} ${r.partner_fa} ${r.partner_en}`.toLowerCase().includes(needle)),
  );

  async function redeem() {
    if (!sel) return;
    setBusy(true);
    try {
      const r = await send<{ code: string; me: Me }>(`/api/rewards/${sel.id}/redeem`);
      setCode(r.code);
      me.setData(r.me);
    } catch (e) {
      toast.show((e as Error).message === "not_enough_credits" ? t.market.notEnough : t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {toast.node}
      <PageHead title={t.market.title} sub={t.market.sub}>
        {authed && (
          <div className="chip chip-sun !px-4 !py-2 text-base">
            {t.market.balance}: <Num value={credits} /> {t.units.credits}
          </div>
        )}
      </PageHead>

      <div className="sticky top-24 z-30 mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="glass flex h-12 flex-1 items-center gap-2 rounded-full px-4 md:max-w-sm">
          <Search size={18} className="text-muted" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.market.search} aria-label={t.market.search} className="h-full w-full bg-transparent outline-none placeholder:text-muted" />
        </label>
        <div className="glass flex gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none]">
          {["all", ...Object.keys(t.market.cats)].map((k) => (
            <button key={k} onClick={() => setCat(k)} className={`relative flex-none rounded-full px-4 py-2 text-sm font-semibold ${cat === k ? "" : "text-muted"}`}>
              {cat === k && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-full bg-[var(--pill-strong)]" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
              <span className="relative">{k === "all" ? t.market.all : t.market.cats[k]}</span>
            </button>
          ))}
        </div>
      </div>

      <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((r) => {
            const [title, partner] = L(r);
            const afford = !authed || credits >= r.cost;
            return (
              <motion.button
                layout
                key={r.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                onClick={() => (setSel(r), setCode(null))}
                className="card flex items-center gap-4 p-4 text-start"
              >
                <span className={`tile tile-${r.category}`}>{r.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{title}</span>
                  <span className="block truncate text-sm text-muted">{partner}</span>
                  {!afford && (
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--pill-strong)]">
                      <span className="bar-sun block h-full rounded-full" style={{ width: `${(credits / r.cost) * 100}%` }} />
                    </span>
                  )}
                </span>
                <span className={`chip ${afford ? "chip-sun" : ""}`}>{fmt(r.cost)}</span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </motion.div>
      {!list.length && <p className="py-20 text-center text-muted">{t.market.empty}</p>}

      <Sheet open={!!sel} onClose={close}>
        {sel && (
          <div className="text-center">
            <span className={`tile tile-${sel.category} mx-auto !size-20 !rounded-3xl !text-4xl`}>{sel.emoji}</span>
            <h2 className="mt-4 text-2xl font-black">{L(sel)[0]}</h2>
            <p className="text-muted">{L(sel)[1]}</p>
            <AnimatePresence mode="wait" initial={false}>
              {code ? (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.35 }} className="mt-6">
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5, delay: 0.1 }} className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-500 text-white">
                    <Check size={30} strokeWidth={3} />
                  </motion.span>
                  <p className="mt-3 font-bold">{t.market.done}</p>
                  <div dir="ltr" className="mt-4 rounded-2xl border border-dashed border-[var(--line-strong)] bg-[var(--pill)] py-4 font-mono text-2xl font-black tracking-[0.2em]">{code}</div>
                  <p className="mt-2 text-sm text-muted">{t.market.codeHint}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(code).then(() => toast.show(t.market.copied))}>
                      <Copy size={16} /> {t.market.copy}
                    </button>
                    <button className="btn btn-sun" onClick={close}>{t.market.close}</button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="buy" exit={{ opacity: 0, scale: 0.95 }} className="mt-6">
                  {!authed ? (
                    <Link href="/login?next=/market" className="btn btn-sun w-full">
                      <LogIn size={18} /> {t.market.loginToRedeem}
                    </Link>
                  ) : (
                    <>
                      {credits < sel.cost && <p className="mb-3 text-sm text-muted">{t.market.need.replace("{n}", fmt(sel.cost - credits))}</p>}
                      <button autoFocus className="btn btn-sun w-full" disabled={busy || credits < sel.cost} onClick={redeem}>
                        {t.market.redeem.replace("{n}", fmt(sel.cost))}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </Sheet>
    </>
  );
}
