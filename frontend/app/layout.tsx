import "@fontsource-variable/inter";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Nav } from "@/components/nav";
import { Providers, type Theme } from "@/components/providers";

export const metadata: Metadata = {
  title: "آفتاب‌چنج | AftabChange",
  description: "Turn sunlight into credits: personal solar energy, community and a green rewards market.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#05070c" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "fa";
  const saved = c.get("theme")?.value;
  const theme: Theme = saved === "light" || saved === "dark" ? saved : "system";
  return (
    <html lang={lang} dir={lang === "fa" ? "rtl" : "ltr"} data-theme={theme === "system" ? undefined : theme}>
      <body className="min-h-svh overflow-x-hidden">
        <div className="aurora" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <Providers authed={c.has("sid")} lang={lang} theme={theme}>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-36 pt-28 md:pb-20">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
