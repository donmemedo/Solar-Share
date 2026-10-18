"use client";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/nav";
import { useI18n } from "@/components/providers";
import { Field, PHONE_RE, cityOptions, cleanPhone, send } from "@/components/ui";
import { WELCOME_CREDITS } from "@/lib/i18n";

const DEMO = { phone: "09120000000", password: "aftab1234" };
type Mode = "login" | "register";
type Form = { name: string; phone: string; password: string; city: string };
type Errors = Partial<Record<keyof Form | "form", string>>;

export default function Login() {
  const { t, fmt } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [f, setF] = useState<Form>({ name: "", phone: "", password: "", city: "Tehran" });
  const [err, setErr] = useState<Errors>({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(form: Form, m: Mode) {
    const phone = cleanPhone(form.phone);
    const e: Errors = {};
    if (m === "register" && form.name.trim().length < 2) e.name = t.auth.required;
    if (!PHONE_RE.test(phone)) e.phone = phone ? t.auth.badPhone : t.auth.required;
    if (!form.password) e.password = t.auth.required;
    else if (m === "register" && form.password.length < 6) e.password = t.auth.shortPw;
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await send(`/api/auth/${m}`, m === "login" ? { phone, password: form.password } : { ...form, phone });
      const next = new URLSearchParams(location.search).get("next");
      // Full reload so the server layout sees the new session cookie. Same-site paths only.
      location.href = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    } catch (x) {
      const code = (x as Error).message;
      setErr({ form: { wrong_credentials: t.auth.wrong, phone_taken: t.auth.taken, invalid: t.auth.invalid }[code] ?? t.error });
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.7 }} className="card p-6 sm:p-8">
        <div className="grid place-items-center text-center">
          <Logo size={56} />
          <h1 className="mt-4 text-3xl font-black tracking-tight">{t.auth.title}</h1>
          <p className="mt-2 text-sm text-muted">{t.auth.sub}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-[var(--pill)] p-1" role="tablist">
          {(["login", "register"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => (setMode(m), setErr({}))} className={`relative rounded-full py-2.5 text-sm font-bold ${mode === m ? "" : "text-muted"}`}>
              {mode === m && <motion.span layoutId="auth-pill" className="absolute inset-0 rounded-full bg-[var(--pill-strong)]" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
              <span className="relative">{t.auth[m]}</span>
            </button>
          ))}
        </div>

        <form noValidate onSubmit={(e) => (e.preventDefault(), submit(f, mode))} className="mt-6 grid gap-4">
          <AnimatePresence initial={false}>
            {mode === "register" && (
              <motion.div key="reg" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }} className="-m-1 grid gap-4 overflow-hidden p-1">
                <Field label={t.auth.name} error={err.name}>
                  <input className="field" value={f.name} onChange={set("name")} autoComplete="name" aria-invalid={!!err.name} />
                </Field>
                <Field label={t.auth.city}>
                  <select className="field" value={f.city} onChange={set("city")}>{cityOptions(t)}</select>
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Field label={t.auth.phone} error={err.phone}>
            <input className="field rtl:text-right" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="09123456789" value={f.phone} onChange={set("phone")} aria-invalid={!!err.phone} />
          </Field>
          <Field label={t.auth.password} error={err.password}>
            <div className="relative">
              <input className="field pe-12" type={show ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={f.password} onChange={set("password")} aria-invalid={!!err.password} />
              <button type="button" onClick={() => setShow(!show)} className="icon-btn absolute end-1 top-1" aria-label={t.auth.showPw} aria-pressed={show}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          {mode === "register" && <p className="text-xs text-muted">🎁 {t.auth.welcome.replace("{n}", fmt(WELCOME_CREDITS))}</p>}
          {err.form && (
            <p role="alert" className="rounded-2xl bg-[#ff453a1a] p-3 text-sm font-semibold text-[#ff453a]">
              {err.form}
            </p>
          )}
          <button className="btn btn-sun w-full" disabled={busy}>
            {mode === "login" ? t.auth.login : t.auth.submitRegister}
          </button>
          <button
            type="button"
            className="btn btn-ghost w-full"
            disabled={busy}
            onClick={() => {
              const d = { ...f, ...DEMO };
              setMode("login");
              setF(d);
              submit(d, "login");
            }}
          >
            {t.auth.demo}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
