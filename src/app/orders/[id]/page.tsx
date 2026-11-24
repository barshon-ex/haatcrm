import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/lang";
import { getCustomer, getOrder, getSettings, listTemplates, orderCod, orderCode, orderTotal } from "@/lib/repo";
import { COURIERS, PAYMENT_METHODS, districtLabel, trackingUrl, waNumber } from "@/lib/bd";
import { fmt, fmtDate, money, num, STATUSES, type Dict } from "@/lib/i18n";
import { renderTemplate } from "@/lib/messages";
import { updateShippingAction, updateStatusAction } from "@/app/actions";
import { RiskBadge, StatusBadge } from "@/components/badges";
import { CopyButton } from "@/components/CopyButton";

const NEXT: Record<string, string> = { pending: "confirmed", confirmed: "packed", packed: "shipped", shipped: "delivered" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const data = getOrder(Number(id));
  if (!data) notFound();
  const { order: o, items, events } = data;
  const customer = getCustomer(o.customer_id)!;
  const settings = getSettings();
  const templates = listTemplates();

  const total = orderTotal(o);
  const cod = orderCod(o);
  const track = trackingUrl(o.courier, o.tracking_id);
  const wa = waNumber(o.customer_phone);

  const vars = {
    name: o.customer_name,
    order: orderCode(o.id),
    items: items.map((i) => `${i.name} ×${i.qty}`).join(", "),
    total,
    cod,
    delivery: o.delivery_charge,
    courier: o.courier ?? "",
    tracking: o.tracking_id ?? "",
    shop: settings.shop_name,
    shop_phone: settings.shop_phone,
  };

  return (
    <>
      <Link href="/orders" className="muted">{t["common.back"]}</Link>
      <div className="page-head" style={{ marginTop: "0.4rem" }}>
        <h1>
          {orderCode(o.id)} <StatusBadge status={o.status} t={t} />
        </h1>
        <Link className="btn" href={`/orders/${o.id}/invoice`}>🖨 {t["order.invoice"]}</Link>
      </div>

      <section className="card">
        <h3>{t["order.changeStatus"]}</h3>
        <div className="status-actions">
          {STATUSES.filter((s) => s !== o.status).map((s) => (
            <form key={s} action={updateStatusAction}>
              <input type="hidden" name="id" value={o.id} />
              <input type="hidden" name="status" value={s} />
              <button className={`btn sm ${NEXT[o.status] === s ? "primary" : ""} ${s === "returned" || s === "cancelled" ? "danger" : ""}`}>
                → {t[`status.${s}` as keyof Dict]}
              </button>
            </form>
          ))}
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div>
          <section className="card">
            <div className="row between">
              <h3>{t["order.customer"]}</h3>
              <RiskBadge risk={customer.risk} t={t} blocked={!!customer.blocked} />
            </div>
            <dl className="kv">
              <dt>{t["order.name"]}</dt>
              <dd><Link href={`/customers/${customer.id}`}>{o.customer_name}</Link></dd>
              <dt>{t["order.phone"]}</dt>
              <dd>
                <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
                {customer.alt_phone && <> · <a href={`tel:${customer.alt_phone}`}>{customer.alt_phone}</a></>}
              </dd>
              <dt>{t["order.address"]}</dt>
              <dd>{o.address || "—"}</dd>
              <dt>{t["order.district"]}</dt>
              <dd>
                {districtLabel(o.district, lang) || "—"} · {o.inside_dhaka ? t["order.insideDhaka"] : t["order.outsideDhaka"]}
              </dd>
              <dt>{t["order.source"]}</dt>
              <dd>{t[`src.${o.source}` as keyof Dict] ?? o.source}</dd>
            </dl>
            <p className="muted" style={{ marginBottom: 0 }}>
              {fmt(t["risk.history"], { d: num(customer.delivered, lang), r: num(customer.returned, lang), c: num(customer.cancelled, lang) })}
              <br />
              {t[`risk.advice.${customer.risk.advice}` as keyof Dict]}
            </p>
          </section>

          <section className="card">
            <h3>{t["order.items"]}</h3>
            <table>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.name}</td>
                    <td className="num">{money(i.price, lang)} × {num(i.qty, lang)}</td>
                    <td className="num"><b>{money(i.price * i.qty, lang)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="totals">
              <div><span>{t["order.subtotal"]}</span><b>{money(o.subtotal, lang)}</b></div>
              {o.discount > 0 && <div><span>{t["order.discount"]}</span><b>−{money(o.discount, lang)}</b></div>}
              <div><span>{t["order.delivery"]}</span><b>{money(o.delivery_charge, lang)}</b></div>
              <div><span>{t["order.total"]}</span><b>{money(total, lang)}</b></div>
              {o.advance_paid > 0 && (
                <div>
                  <span>{t["order.advance"]} {o.advance_method ? `(${o.advance_method})` : ""} {o.trx_id ? `· ${o.trx_id}` : ""}</span>
                  <b>−{money(o.advance_paid, lang)}</b>
                </div>
              )}
              <div className="cod"><span>{t["order.cod"]}</span><b>{money(cod, lang)}</b></div>
            </div>
            {o.note && <p><b>{t["order.note"]}:</b> {o.note}</p>}
          </section>

          <section className="card">
            <h3>{t["order.timeline"]}</h3>
            <ul className="timeline">
              {events.map((e) => (
                <li key={e.id}>
                  <StatusBadge status={e.status} t={t} />
                  <small className="muted">{fmtDate(e.created_at, lang)}</small>
                  {e.note && <small>{e.note}</small>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div>
          <section className="card">
            <h3>🚚 {t["order.shipping"]}</h3>
            <form action={updateShippingAction} key={o.updated_at + o.status}>
              <input type="hidden" name="id" value={o.id} />
              <div className="row gap">
                <label className="grow">
                  {t["order.courier"]}
                  <select name="courier" defaultValue={o.courier ?? ""}>
                    <option value="">—</option>
                    {COURIERS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="grow">
                  {t["order.tracking"]}
                  <input name="tracking_id" defaultValue={o.tracking_id ?? ""} />
                </label>
              </div>
              {track && (
                <p style={{ marginTop: "-0.3rem" }}>
                  <a href={track} target="_blank" rel="noreferrer">↗ {t["order.track"]}</a>
                </p>
              )}
              <div className="row gap">
                <label className="grow">
                  {t["order.delivery"]}
                  <input name="delivery_charge" type="number" min={0} defaultValue={o.delivery_charge} />
                </label>
                <label className="grow">
                  {t["order.discount"]}
                  <input name="discount" type="number" min={0} defaultValue={o.discount} />
                </label>
              </div>
              <div className="row gap">
                <label className="grow">
                  {t["order.advance"]}
                  <input name="advance_paid" type="number" min={0} defaultValue={o.advance_paid} />
                </label>
                <label className="grow">
                  {t["order.method"]}
                  <select name="advance_method" defaultValue={o.advance_method ?? ""}>
                    <option value="">—</option>
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <label className="grow">
                  {t["order.trxId"]}
                  <input name="trx_id" defaultValue={o.trx_id ?? ""} />
                </label>
              </div>
              <label>
                {t["order.note"]}
                <input name="note" defaultValue={o.note} />
              </label>
              <button className="btn primary">{t["order.update"]}</button>
            </form>
          </section>

          <section className="card">
            <h3>💬 {t["order.messages"]}</h3>
            {templates.map((tpl) => {
              const text = renderTemplate(tpl.body, vars);
              return (
                <div key={tpl.id} className="msg">
                  <b>{tpl.name}</b>
                  <pre>{text}</pre>
                  <div className="row gap">
                    <CopyButton text={text} label={"⧉ " + t["common.copy"]} done={t["common.copied"]} />
                    {wa && (
                      <a className="btn sm wa" href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </>
  );
}
