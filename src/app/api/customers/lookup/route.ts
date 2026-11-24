import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/bd";
import { findCustomerByPhone } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const phone = normalizePhone(new URL(req.url).searchParams.get("phone"));
  if (!phone) return NextResponse.json({ customer: null });
  const c = findCustomerByPhone(phone);
  if (!c) return NextResponse.json({ customer: null });
  return NextResponse.json({
    customer: {
      id: c.id,
      name: c.name,
      address: c.address,
      district: c.district,
      blocked: !!c.blocked,
      orders: c.orders,
      delivered: c.delivered,
      returned: c.returned,
      cancelled: c.cancelled,
      risk: c.risk,
    },
  });
}
