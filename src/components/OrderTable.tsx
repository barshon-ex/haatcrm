import Link from "next/link";
import { districtLabel } from "@/lib/bd";
import { fmtDate, money, type Dict, type Lang } from "@/lib/i18n";
import { orderCod, orderCode, type OrderRow } from "@/lib/repo";
import { StatusBadge } from "./badges";

export function OrderTable({ orders, t, lang }: { orders: OrderRow[]; t: Dict; lang: Lang }) {
  if (!orders.length) return <div className="empty">{t["order.none"]}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t["order.code"]}</th>
            <th>{t["order.customer"]}</th>
            <th className="hide-sm">{t["order.items"]}</th>
            <th className="num">{t["order.cod"]}</th>
            <th>{t["order.status"]}</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="code">
                <Link href={`/orders/${o.id}`}>
                  <b>{orderCode(o.id)}</b>
                </Link>
                <div className="cell-sub">{fmtDate(o.created_at, lang, false)}</div>
              </td>
              <td>
                {o.customer_name}
                <div className="cell-sub">
                  {o.customer_phone}
                  {o.district ? ` · ${districtLabel(o.district, lang)}` : ""}
                </div>
              </td>
              <td className="hide-sm">{o.item_summary}</td>
              <td className="num">
                <b>{money(orderCod(o), lang)}</b>
                {o.advance_paid > 0 && <div className="cell-sub">+{money(o.advance_paid, lang)} {o.advance_method ?? ""}</div>}
              </td>
              <td>
                <StatusBadge status={o.status} t={t} />
                {o.courier && <div className="cell-sub">{o.courier}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
