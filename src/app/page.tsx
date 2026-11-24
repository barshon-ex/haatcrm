import Link from "next/link";
import { getT } from "@/lib/lang";
import { dashboardStats } from "@/lib/repo";
import { fmt, money, num } from "@/lib/i18n";
import { OrderTable } from "@/components/OrderTable";
import { RiskBadge } from "@/components/badges";

export default async function Dashboard() {
  const { t, lang } = await getT();
  const s = dashboardStats();

  return (
    <>
      <div className="page-head">
        <h1>{t["nav.dashboard"]}</h1>
        <Link href="/orders/new" className="btn primary">
          ＋ {t["nav.newOrder"]}
        </Link>
      </div>

      <div className="stats">
        <div className="stat hl">
          <div className="k">{t["dash.today"]}</div>
          <div className="v">{num(s.today.c, lang)}</div>
          <div className="s">{money(s.today.v, lang)}</div>
        </div>
        <Link href="/orders?status=pending" className="stat" style={{ color: "inherit" }}>
          <div className="k">{t["dash.pending"]}</div>
          <div className="v">{num(s.pending.c, lang)}</div>
        </Link>
        <Link href="/orders?status=shipped" className="stat" style={{ color: "inherit" }}>
          <div className="k">{t["dash.inTransit"]}</div>
          <div className="v">{money(s.inTransit.v, lang)}</div>
          <div className="s">{num(s.inTransit.c, lang)} {t["nav.orders"]}</div>
        </Link>
        <div className="stat">
          <div className="k">{t["dash.monthSales"]}</div>
          <div className="v">{money(s.month.v, lang)}</div>
          <div className="s">{num(s.month.c, lang)} {t["nav.orders"]}</div>
        </div>
        <div className="stat">
          <div className="k">{t["dash.returnRate"]}</div>
          <div className="v" style={{ color: s.returnRate >= 20 ? "var(--bad)" : undefined }}>{num(s.returnRate, lang)}%</div>
        </div>
      </div>

      <div className="grid-2 dash-grid">
        <section className="card">
          <div className="row between">
            <h2>{t["dash.recent"]}</h2>
            <Link href="/orders">{t["common.view"]} →</Link>
          </div>
          {s.recent.length ? (
            <OrderTable orders={s.recent} t={t} lang={lang} />
          ) : (
            <div className="empty">
              {t["dash.empty"]}
              <div style={{ marginTop: "0.8rem" }}>
                <Link href="/orders/new" className="btn primary">＋ {t["nav.newOrder"]}</Link>
              </div>
            </div>
          )}
        </section>

        <div>
          <section className="card">
            <h2>⚠ {t["dash.risky"]}</h2>
            {s.risky.length ? (
              <table>
                <tbody>
                  {s.risky.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/customers/${c.id}`}>{c.name}</Link>
                        <div className="cell-sub">
                          {c.phone} · {fmt(t["risk.history"], { d: num(c.delivered, lang), r: num(c.returned, lang), c: num(c.cancelled, lang) })}
                        </div>
                      </td>
                      <td className="num">
                        <RiskBadge risk={c.risk} t={t} blocked={!!c.blocked} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">—</p>
            )}
          </section>

          {s.byCourier.length > 0 && (
            <section className="card">
              <h2>🚚 {t["dash.byCourier"]}</h2>
              {s.byCourier.map((c) => {
                const fin = c.delivered + c.returned;
                const pct = fin ? Math.round((c.delivered / fin) * 100) : 0;
                return (
                  <div key={c.courier} style={{ marginBottom: "0.6rem" }}>
                    <div className="row between">
                      <b>{c.courier}</b>
                      <small className="muted">
                        {num(c.total, lang)} · ✓{num(c.delivered, lang)} · ↩{num(c.returned, lang)}
                      </small>
                    </div>
                    <div className="bar"><span style={{ width: `${fin ? pct : 0}%` }} /></div>
                  </div>
                );
              })}
            </section>
          )}

          {s.lowStock.length > 0 && (
            <section className="card">
              <h2>📦 {t["dash.lowStock"]}</h2>
              {s.lowStock.map((p) => (
                <div key={p.id} className="row between">
                  <span>{p.name}</span>
                  <b style={{ color: p.stock <= 0 ? "var(--bad)" : "var(--warn)" }}>{num(p.stock, lang)}</b>
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
