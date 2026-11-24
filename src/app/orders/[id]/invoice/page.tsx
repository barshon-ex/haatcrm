import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/lang";
import { getOrder, getSettings, orderCod, orderCode, orderTotal } from "@/lib/repo";
import { districtLabel } from "@/lib/bd";
import { fmtDate, money, num } from "@/lib/i18n";
import { PrintButton } from "@/components/PrintButton";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t, lang } = await getT();
  const data = getOrder(Number(id));
  if (!data) notFound();
  const { order: o, items } = data;
  const s = getSettings();
  const cod = orderCod(o);

  return (
    <>
      <div className="row gap no-print" style={{ marginBottom: "1rem" }}>
        <Link href={`/orders/${o.id}`} className="btn">{t["common.back"]}</Link>
        <PrintButton label={t["common.print"]} />
      </div>

      <div className="invoice">
        <div className="invoice-head">
          <div>
            <h2 style={{ margin: 0 }}>{s.shop_name}</h2>
            {s.shop_phone && <div>{s.shop_phone}</div>}
            {s.shop_page && <small>{s.shop_page}</small>}
          </div>
          <div style={{ textAlign: "right" }}>
            <b>{t["inv.title"]} {orderCode(o.id)}</b>
            <div>{fmtDate(o.created_at, lang, false)}</div>
          </div>
        </div>

        <p>
          <b>{t["inv.to"]}:</b> {o.customer_name} · {o.customer_phone}
          <br />
          {o.address}
          {o.district ? `, ${districtLabel(o.district, lang)}` : ""}
        </p>

        <table>
          <thead>
            <tr>
              <th>{t["order.item"]}</th>
              <th className="num">{t["order.price"]}</th>
              <th className="num">{t["order.qty"]}</th>
              <th className="num">{t["order.total"]}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td className="num">{money(i.price, lang)}</td>
                <td className="num">{num(i.qty, lang)}</td>
                <td className="num">{money(i.price * i.qty, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="totals" style={{ maxWidth: 320, marginLeft: "auto" }}>
          <div><span>{t["order.subtotal"]}</span><b>{money(o.subtotal, lang)}</b></div>
          {o.discount > 0 && <div><span>{t["order.discount"]}</span><b>−{money(o.discount, lang)}</b></div>}
          <div><span>{t["order.delivery"]}</span><b>{money(o.delivery_charge, lang)}</b></div>
          <div><span>{t["order.total"]}</span><b>{money(orderTotal(o), lang)}</b></div>
          {o.advance_paid > 0 && <div><span>{t["order.advance"]}</span><b>−{money(o.advance_paid, lang)}</b></div>}
        </div>

        <div className="collect">
          {t["inv.collect"]}: {money(cod, lang)}
        </div>
        <p style={{ textAlign: "center" }} className="muted">{t["inv.thanks"]}</p>

        {/* Cut-out label to stick on the parcel */}
        <div className="label-slip">
          <div className="row between">
            <b>{orderCode(o.id)}</b>
            <span>{o.courier ?? ""} {o.tracking_id ?? ""}</span>
          </div>
          <div className="big">{o.customer_name} — {o.customer_phone}</div>
          <div>{o.address}{o.district ? `, ${districtLabel(o.district, lang)}` : ""}</div>
          <div className="big" style={{ marginTop: "0.4rem" }}>COD: {money(cod, lang)}</div>
          <small>{s.shop_name} {s.shop_phone}</small>
        </div>
      </div>
    </>
  );
}
