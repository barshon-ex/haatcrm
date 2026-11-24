import { listOrders, orderCode, orderCod, orderTotal } from "@/lib/repo";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") ?? "all";
  const rows = listOrders({ status, limit: 100000 });
  const csv = toCsv([
    ["order", "date_utc", "status", "customer", "phone", "address", "district", "items", "subtotal", "discount", "delivery", "advance", "advance_method", "trx_id", "total", "cod", "courier", "tracking_id", "note"],
    ...rows.map((o) => [
      orderCode(o.id), o.created_at, o.status, o.customer_name, o.customer_phone, o.address, o.district, o.item_summary,
      o.subtotal, o.discount, o.delivery_charge, o.advance_paid, o.advance_method, o.trx_id, orderTotal(o), orderCod(o),
      o.courier, o.tracking_id, o.note,
    ]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haatcrm-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
