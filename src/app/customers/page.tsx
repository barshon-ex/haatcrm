import Link from "next/link";
import { getT } from "@/lib/lang";
import { listCustomers } from "@/lib/repo";
import { districtLabel } from "@/lib/bd";
import { money, num } from "@/lib/i18n";
import { RiskBadge } from "@/components/badges";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; risk?: string }> }) {
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = sp.q ?? "";
  const riskFilter = sp.risk ?? "all";
  let customers = listCustomers(q);
  if (riskFilter !== "all") customers = customers.filter((c) => c.risk.level === riskFilter);

  return (
    <>
      <div className="page-head">
        <h1>{t["cust.title"]}</h1>
        <a className="btn" href="/api/export/customers">⬇ {t["order.exportCsv"]}</a>
      </div>
      <form className="search">
        <input type="hidden" name="risk" value={riskFilter} />
        <input name="q" defaultValue={q} placeholder={t["cust.search"]} />
        <button className="btn">🔍</button>
      </form>
      <div className="tabs">
        {(["all", "high", "medium", "low", "new"] as const).map((r) => (
          <Link key={r} href={`/customers?risk=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={riskFilter === r ? "on" : ""}>
            {r === "all" ? t["status.all"] : t[`risk.${r}`]}
          </Link>
        ))}
      </div>
      <section className="card">
        {customers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t["order.name"]}</th>
                  <th className="hide-sm">{t["order.district"]}</th>
                  <th className="num">{t["cust.orders"]}</th>
                  <th className="num hide-sm">{t["cust.spent"]}</th>
                  <th>{t["cust.risk"]}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/customers/${c.id}`}><b>{c.name}</b></Link>
                      <div className="cell-sub">{c.phone}{c.tags ? ` · ${c.tags}` : ""}</div>
                    </td>
                    <td className="hide-sm">{districtLabel(c.district, lang)}</td>
                    <td className="num">{num(c.orders, lang)}</td>
                    <td className="num hide-sm">{money(c.spent, lang)}</td>
                    <td><RiskBadge risk={c.risk} t={t} blocked={!!c.blocked} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">—</div>
        )}
      </section>
    </>
  );
}
