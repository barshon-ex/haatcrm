"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dict } from "@/lib/i18n";

const ITEMS: { href: string; key: keyof Dict; icon: string; mobile?: boolean }[] = [
  { href: "/", key: "nav.dashboard", icon: "◧", mobile: true },
  { href: "/orders", key: "nav.orders", icon: "▤", mobile: true },
  { href: "/orders/new", key: "nav.newOrder", icon: "＋", mobile: true },
  { href: "/customers", key: "nav.customers", icon: "☺", mobile: true },
  { href: "/products", key: "nav.products", icon: "▦" },
  { href: "/templates", key: "nav.templates", icon: "✉" },
  { href: "/settings", key: "nav.settings", icon: "⚙", mobile: true },
];

export function Nav({ t, variant }: { t: Dict; variant: "side" | "bottom" }) {
  const path = usePathname();
  const active = (href: string) =>
    href === "/" ? path === "/" : href === "/orders" ? path === "/orders" || (/^\/orders\/\d/.test(path)) : path.startsWith(href);
  if (variant === "side")
    return (
      <nav className="side-nav">
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={active(i.href) ? "active" : ""}>
            <span className="ico">{i.icon}</span> {t[i.key]}
          </Link>
        ))}
      </nav>
    );
  return (
      <nav className="bottom-nav no-print">
        {ITEMS.filter((i) => i.mobile).map((i) => (
          <Link key={i.href} href={i.href} className={`${active(i.href) ? "active" : ""} ${i.href === "/orders/new" ? "fab" : ""}`}>
            <span className="ico">{i.icon}</span>
            <span className="lbl">{t[i.key]}</span>
          </Link>
        ))}
      </nav>
  );
}
