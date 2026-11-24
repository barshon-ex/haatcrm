import { listCustomers } from "@/lib/repo";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = listCustomers("", 1000000);
  const csv = toCsv([
    ["name", "phone", "alt_phone", "address", "district", "source", "tags", "orders", "delivered", "returned", "cancelled", "spent", "risk", "risk_score", "blocked"],
    ...rows.map((c) => [
      c.name, c.phone, c.alt_phone, c.address, c.district, c.source, c.tags, c.orders, c.delivered, c.returned, c.cancelled,
      c.spent, c.risk.level, c.risk.score, c.blocked,
    ]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="haatcrm-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
