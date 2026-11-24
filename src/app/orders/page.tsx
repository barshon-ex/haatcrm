import Link from "next/link";
import { getT } from "@/lib/lang";
import { listOrders, statusCounts } from "@/lib/repo";
import { num, STATUSES, type Dict } from "@/lib/i18n";
import { OrderTable } from "@/components/OrderTable";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { t, lang } = await getT();
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const q = sp.q ?? "";
  const orders = listOrders({ status, q });
  const counts = statusCounts();

  const href = (s: string) => `/orders?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <div className="page-head">
        <h1>{t["nav.orders"]}</h1>
        <div className="row gap">
          <a className="btn" href={`/api/export/orders?status=${status}`}>⬇ {t["order.exportCsv"]}</a>
          <Link href="/orders/new" className="btn primary">＋ {t["nav.newOrder"]}</Link>
        </div>
      </div>

      <form className="search">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} placeholder={t["order.search"]} />
        <button className="btn">🔍</button>
      </form>

      <div className="tabs">
        {(["all", ...STATUSES] as const).map((s) => (
          <Link key={s} href={href(s)} className={status === s ? "on" : ""}>
            {t[`status.${s}` as keyof Dict]}
            <span className="count">{num(counts[s] ?? 0, lang)}</span>
          </Link>
        ))}
      </div>

      <section className="card">
        <OrderTable orders={orders} t={t} lang={lang} />
      </section>
    </>
  );
}
