import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { LangToggle } from "@/components/LangToggle";
import { getT } from "@/lib/lang";
import { getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HaatCRM",
  description: "Open-source CRM for Facebook & WhatsApp sellers in Bangladesh",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { lang, t } = await getT();
  const settings = getSettings();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="shell">
          <aside className="sidebar no-print">
            <Link href="/" className="brand">
              <span className="logo">হাট</span>
              <span>
                <b>HaatCRM</b>
                <small>{settings.shop_name}</small>
              </span>
            </Link>
            <Nav t={t} variant="side" />
            <div className="sidebar-foot">
              <LangToggle lang={lang} />
              <small className="muted">{t["app.tagline"]}</small>
            </div>
          </aside>
          <header className="topbar no-print">
            <Link href="/" className="brand">
              <span className="logo">হাট</span>
              <b>{settings.shop_name}</b>
            </Link>
            <LangToggle lang={lang} />
          </header>
          <main className="content">{children}</main>
          <Nav t={t} variant="bottom" />
        </div>
      </body>
    </html>
  );
}
