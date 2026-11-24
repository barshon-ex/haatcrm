import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/lang";
import { getCustomer, listCustomerOrders } from "@/lib/repo";
import { DISTRICTS, phoneOperator, waNumber } from "@/lib/bd";
import { fmt, fmtDate, money, num, SOURCES, type Dict } from "@/lib/i18n";
import { toggleBlockAction, updateCustomerAction } from "@/app/actions";
import { RiskBadge } from "@/components/badges";
import { OrderTable } from "@/components/OrderTable";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const c = getCustomer(Number(id));
  if (!c) notFound();
  const orders = listCustomerOrders(c.id);
  const wa = waNumber(c.phone);

  return (
    <>
      <Link href="/customers" className="muted">{t["common.back"]}</Link>
      <div className="page-head" style={{ marginTop: "0.4rem" }}>
        <h1>{c.name} <RiskBadge risk={c.risk} t={t} blocked={!!c.blocked} /></h1>
        <div className="row gap">
          <a className="btn" href={`tel:${c.phone}`}>📞 {t["cust.call"]}</a>
          {wa && <a className="btn wa" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">{t["cust.whatsapp"]}</a>}
          <Link className="btn primary" href="/orders/new">＋ {t["nav.newOrder"]}</Link>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><div className="k">{t["cust.orders"]}</div><div className="v">{num(c.orders, lang)}</div></div>
        <div className="stat"><div className="k">{t["cust.spent"]}</div><div className="v">{money(c.spent, lang)}</div></div>
        <div className="stat">
          <div className="k">{t["cust.risk"]}</div>
          <div className="v">{c.risk.score === null ? "—" : `${num(c.risk.score, lang)}/${num(100, lang)}`}</div>
          <div className="s">{fmt(t["risk.history"], { d: num(c.delivered, lang), r: num(c.returned, lang), c: num(c.cancelled, lang) })}</div>
        </div>
        <div className="stat">
          <div className="k">{t["cust.operator"]}</div>
          <div className="v" style={{ fontSize: "1.1rem" }}>{phoneOperator(c.phone) ?? "—"}</div>
          <div className="s">{t["cust.since"]}: {fmtDate(c.created_at, lang, false)}</div>
        </div>
      </div>

      <p className={`lookup risk-box-${c.blocked ? "high" : c.risk.level}`}>{t[`risk.advice.${c.risk.advice}` as keyof Dict]}</p>

      <div className="grid-2">
        <section className="card">
          <form action={updateCustomerAction} key={JSON.stringify(c)}>
            <input type="hidden" name="id" value={c.id} />
            <label>{t["order.name"]}<input name="name" defaultValue={c.name} required /></label>
            <div className="row gap">
              <label className="grow">{t["order.phone"]}<input value={c.phone} disabled /></label>
              <label className="grow">{t["order.altPhone"]}<input name="alt_phone" defaultValue={c.alt_phone ?? ""} /></label>
            </div>
            <label>{t["order.address"]}<textarea name="address" rows={2} defaultValue={c.address ?? ""} /></label>
            <div className="row gap">
              <label className="grow">
                {t["order.district"]}
                <select name="district" defaultValue={c.district ?? ""}>
                  <option value="">—</option>
                  {DISTRICTS.map((d) => <option key={d.en} value={d.en}>{lang === "bn" ? d.bn : d.en}</option>)}
                </select>
              </label>
              <label className="grow">
                {t["order.source"]}
                <select name="source" defaultValue={c.source}>
                  {SOURCES.map((s) => <option key={s} value={s}>{t[`src.${s}` as keyof Dict]}</option>)}
                </select>
              </label>
            </div>
            <label>{t["cust.fb"]}<input name="fb_profile" defaultValue={c.fb_profile ?? ""} placeholder="https://facebook.com/..." /></label>
            <label>{t["cust.tags"]}<input name="tags" defaultValue={c.tags} placeholder="VIP, wholesale" /></label>
            <label>{t["cust.notes"]}<textarea name="notes" rows={3} defaultValue={c.notes} /></label>
            <button className="btn primary">{t["cust.save"]}</button>
          </form>
          <form action={toggleBlockAction} style={{ marginTop: "0.8rem" }}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="blocked" value={c.blocked ? "0" : "1"} />
            <button className="btn danger sm">{c.blocked ? t["cust.unblock"] : "⛔ " + t["cust.block"]}</button>
          </form>
          {c.fb_profile && <p><a href={c.fb_profile} target="_blank" rel="noreferrer">↗ Facebook</a></p>}
        </section>

        <section className="card">
          <h3>{t["nav.orders"]}</h3>
          <OrderTable orders={orders} t={t} lang={lang} />
        </section>
      </div>
    </>
  );
}
