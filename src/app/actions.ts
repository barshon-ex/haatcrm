"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { normalizePhone, isInsideDhaka } from "@/lib/bd";
import { STATUSES, type OrderStatus } from "@/lib/i18n";
import * as repo from "@/lib/repo";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => {
  const n = Math.round(Number(String(f.get(k) ?? "0").replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : 0;
};
const orNull = (s: string) => (s ? s : null);

export type ActionState = { error?: string; ok?: boolean } | undefined;

export async function setLanguage(lang: "bn" | "en") {
  (await cookies()).set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}

export async function createOrderAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const phone = normalizePhone(str(f, "phone"));
  if (!phone) return { error: "phone" };
  const name = str(f, "name");
  if (!name) return { error: "name" };

  let items: { product_id: number | null; name: string; price: number; qty: number }[] = [];
  try {
    items = (JSON.parse(str(f, "items") || "[]") as typeof items)
      .map((i) => ({
        product_id: i.product_id ? Number(i.product_id) : null,
        name: String(i.name ?? "").trim(),
        price: Math.max(0, Math.round(Number(i.price) || 0)),
        qty: Math.max(1, Math.round(Number(i.qty) || 1)),
      }))
      .filter((i) => i.name);
  } catch {
    return { error: "items" };
  }
  if (!items.length) return { error: "items" };

  const district = orNull(str(f, "district"));
  const insideRaw = str(f, "inside_dhaka");
  const inside = insideRaw ? insideRaw === "1" : isInsideDhaka(district);

  const id = repo.createOrder({
    customer: {
      name,
      phone,
      alt_phone: normalizePhone(str(f, "alt_phone")),
      address: str(f, "address"),
      district,
    },
    source: str(f, "source") || "facebook",
    inside_dhaka: inside,
    items,
    discount: Math.max(0, int(f, "discount")),
    delivery_charge: Math.max(0, int(f, "delivery_charge")),
    advance_paid: Math.max(0, int(f, "advance_paid")),
    advance_method: orNull(str(f, "advance_method")),
    trx_id: orNull(str(f, "trx_id").toUpperCase()),
    note: str(f, "note"),
  });
  revalidatePath("/", "layout");
  redirect(`/orders/${id}`);
}

export async function updateStatusAction(f: FormData) {
  const id = int(f, "id");
  const status = str(f, "status") as OrderStatus;
  if (!id || !STATUSES.includes(status)) return;
  repo.updateOrderStatus(id, status, str(f, "note"));
  revalidatePath("/", "layout");
}

export async function updateShippingAction(f: FormData) {
  const id = int(f, "id");
  if (!id) return;
  repo.updateOrderShipping(id, {
    courier: orNull(str(f, "courier")),
    tracking_id: orNull(str(f, "tracking_id")),
    delivery_charge: Math.max(0, int(f, "delivery_charge")),
    discount: Math.max(0, int(f, "discount")),
    advance_paid: Math.max(0, int(f, "advance_paid")),
    advance_method: orNull(str(f, "advance_method")),
    trx_id: orNull(str(f, "trx_id").toUpperCase()),
    note: str(f, "note"),
  });
  // Adding a tracking ID to a packed/confirmed order moves it to "shipped" automatically.
  const o = repo.getOrder(id)?.order;
  if (o && o.tracking_id && ["pending", "confirmed", "packed"].includes(o.status)) {
    repo.updateOrderStatus(id, "shipped", `${o.courier ?? ""} ${o.tracking_id}`.trim());
  }
  revalidatePath("/", "layout");
}

export async function updateCustomerAction(f: FormData) {
  const id = int(f, "id");
  if (!id) return;
  repo.updateCustomer(id, {
    name: str(f, "name"),
    alt_phone: normalizePhone(str(f, "alt_phone")),
    address: orNull(str(f, "address")),
    district: orNull(str(f, "district")),
    fb_profile: orNull(str(f, "fb_profile")),
    tags: str(f, "tags"),
    notes: str(f, "notes"),
    source: str(f, "source") || "facebook",
  });
  revalidatePath("/", "layout");
}

export async function toggleBlockAction(f: FormData) {
  const id = int(f, "id");
  if (!id) return;
  repo.setCustomerBlocked(id, str(f, "blocked") === "1");
  revalidatePath("/", "layout");
}

export async function saveProductAction(f: FormData) {
  const name = str(f, "name");
  if (!name) return;
  repo.saveProduct({
    id: int(f, "id") || undefined,
    name,
    sku: orNull(str(f, "sku")),
    price: Math.max(0, int(f, "price")),
    stock: int(f, "stock"),
    active: f.get("active") !== null,
  });
  revalidatePath("/", "layout");
}

export async function saveTemplateAction(f: FormData) {
  const name = str(f, "name");
  const body = String(f.get("body") ?? "");
  if (!name || !body.trim()) return;
  repo.saveTemplate({ id: int(f, "id") || undefined, name, body });
  revalidatePath("/", "layout");
}

export async function deleteTemplateAction(f: FormData) {
  const id = int(f, "id");
  if (id) repo.deleteTemplate(id);
  revalidatePath("/", "layout");
}

export async function saveSettingsAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  repo.saveSettings({
    shop_name: str(f, "shop_name") || "আমার দোকান",
    shop_phone: str(f, "shop_phone"),
    shop_page: str(f, "shop_page"),
    delivery_inside: String(Math.max(0, int(f, "delivery_inside"))),
    delivery_outside: String(Math.max(0, int(f, "delivery_outside"))),
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
