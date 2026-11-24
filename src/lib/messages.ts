// Fill message templates with order data. Pure — usable on server and client.
export interface MessageVars {
  name: string;
  order: string;
  items: string;
  total: number;
  cod: number;
  delivery: number;
  courier: string;
  tracking: string;
  shop: string;
  shop_phone: string;
}

export function renderTemplate(body: string, v: MessageVars): string {
  const map: Record<string, string> = {
    name: v.name,
    order: v.order,
    items: v.items,
    total: String(v.total),
    cod: String(v.cod),
    delivery: String(v.delivery),
    courier: v.courier || "-",
    tracking: v.tracking || "-",
    shop: v.shop,
    shop_phone: v.shop_phone || "-",
  };
  return body.replace(/\{(\w+)\}/g, (m, k: string) => (k in map ? map[k] : m));
}
