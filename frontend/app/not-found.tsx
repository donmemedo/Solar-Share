"use client";
import Link from "next/link";
import { useI18n } from "@/components/providers";

export default function NotFound() {
  const { t, fmt } = useI18n();
  return (
    <div className="grid min-h-[60svh] place-items-center text-center">
      <div>
        <div className="text-sun text-8xl font-black tracking-tight md:text-9xl">{fmt(404, { useGrouping: false })}</div>
        <h1 className="mt-4 text-2xl font-bold">🌥️ {t.notFound.title}</h1>
        <Link href="/" className="btn btn-sun mt-8">{t.notFound.back}</Link>
      </div>
    </div>
  );
}
