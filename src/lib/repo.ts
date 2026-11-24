import "server-only";
import { db } from "./db";
import { computeRisk, type Risk } from "./risk";
import type { OrderStatus } from "./i18n";

export interface Customer {
  id: number;
  name: string;
  phone: string;
  alt_phone: string | null;
  address: string | null;
  district: string | null;
  source: string;
  fb_profile: string | null;
  tags: string;
  notes: string;
  blocked: number;
  created_at: string;
}

export interface CustomerStats {
  orders: number;
  delivered: number;
  returned: number;
  cancelled: number;
  spent: number;
}

export interface CustomerWithStats extends Customer, CustomerStats {
  risk: Risk;
}

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  price: number;
  stock: number;
  active: number;
  created_at: string;
}

export interface Order {
  id: number;
  customer_id: number;
  status: OrderStatus;
  source: string;
  address: string;
  district: string | null;
  inside_dhaka: number;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  advance_paid: number;
  advance_method: string | null;
  trx_id: string | null;
  courier: string | null;
  tracking_id: string | null;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface OrderRow extends Order {
  customer_name: string;
  customer_phone: string;
  item_summary: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  name: string;
  price: number;
  qty: number;
}

export interface OrderEvent {
  id: number;
  order_id: number;
  status: string;
  note: string;
  created_at: string;
}

export interface Template {
  id: number;
  name: string;
  body: string;
}

export const orderCode = (id: number) => `HT-${1000 + id}`;
export const orderTotal = (o: Pick<Order, "subtotal" | "discount" | "delivery_charge">) =>
  o.subtotal - o.discount + o.delivery_charge;
export const orderCod = (o: Pick<Order, "subtotal" | "discount" | "delivery_charge" | "advance_paid">) =>
  Math.max(0, orderTotal(o) - o.advance_paid);

/** Parse "HT-1023" or "1023" or "23" into an order id. */
export function parseOrderCode(q: string): number | null {
  const m = q.trim().match(/^(?:HT-?)?(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 1000 ? n - 1000 : n;
}

// ───────────────────────── settings ─────────────────────────

export function getSettings(): Record<string, string> {
  const rows = db().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function saveSettings(values: Record<string, string>) {
  const stmt = db().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  );
  db().transaction(() => {
    for (const [k, v] of Object.entries(values)) stmt.run(k, v);
  })();
}

// ───────────────────────── customers ─────────────────────────

const STATS_SQL = `
  COUNT(o.id) AS orders,
  COALESCE(SUM(o.status = 'delivered'), 0) AS delivered,
  COALESCE(SUM(o.status = 'returned'), 0) AS returned,
  COALESCE(SUM(o.status = 'cancelled'), 0) AS cancelled,
  COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.subtotal - o.discount ELSE 0 END), 0) AS spent
`;

function withRisk<T extends CustomerStats>(c: T): T & { risk: Risk } {
  return { ...c, risk: computeRisk(c) };
}

export function listCustomers(q = "", limit = 500): CustomerWithStats[] {
  const like = `%${q.trim()}%`;
  const rows = db()
    .prepare(
      `SELECT c.*, ${STATS_SQL}
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       WHERE (? = '' OR c.name LIKE ? OR c.phone LIKE ? OR c.tags LIKE ?)
       GROUP BY c.id ORDER BY c.created_at DESC, c.id DESC LIMIT ?`,
    )
    .all(q.trim(), like, like, like, limit) as (Customer & CustomerStats)[];
  return rows.map(withRisk);
}

export function getCustomer(id: number): CustomerWithStats | null {
  const row = db()
    .prepare(
      `SELECT c.*, ${STATS_SQL} FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.id = ? GROUP BY c.id`,
    )
    .get(id) as (Customer & CustomerStats) | undefined;
  return row ? withRisk(row) : null;
}

export function findCustomerByPhone(phone: string): CustomerWithStats | null {
  const row = db()
    .prepare(
      `SELECT c.*, ${STATS_SQL} FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       WHERE c.phone = ? OR c.alt_phone = ? GROUP BY c.id`,
    )
    .get(phone, phone) as (Customer & CustomerStats) | undefined;
  return row ? withRisk(row) : null;
}

export function upsertCustomer(input: {
  name: string;
  phone: string;
  alt_phone?: string | null;
  address?: string | null;
  district?: string | null;
  source?: string;
}): number {
  const existing = db().prepare("SELECT id FROM customers WHERE phone = ?").get(input.phone) as
    | { id: number }
    | undefined;
  if (existing) {
    db()
      .prepare(
        `UPDATE customers SET name = ?, alt_phone = COALESCE(?, alt_phone),
         address = COALESCE(NULLIF(?, ''), address), district = COALESCE(?, district) WHERE id = ?`,
      )
      .run(input.name, input.alt_phone ?? null, input.address ?? "", input.district ?? null, existing.id);
    return existing.id;
  }
  const r = db()
    .prepare(
      "INSERT INTO customers (name, phone, alt_phone, address, district, source) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      input.name,
      input.phone,
      input.alt_phone ?? null,
      input.address ?? null,
      input.district ?? null,
      input.source ?? "facebook",
    );
  return Number(r.lastInsertRowid);
}

export function updateCustomer(
  id: number,
  f: Pick<Customer, "name" | "alt_phone" | "address" | "district" | "fb_profile" | "tags" | "notes" | "source">,
) {
  db()
    .prepare(
      `UPDATE customers SET name=?, alt_phone=?, address=?, district=?, fb_profile=?, tags=?, notes=?, source=? WHERE id=?`,
    )
    .run(f.name, f.alt_phone, f.address, f.district, f.fb_profile, f.tags, f.notes, f.source, id);
}

export function setCustomerBlocked(id: number, blocked: boolean) {
  db().prepare("UPDATE customers SET blocked = ? WHERE id = ?").run(blocked ? 1 : 0, id);
}

// ───────────────────────── products ─────────────────────────

export function listProducts(activeOnly = false): Product[] {
  return db()
    .prepare(`SELECT * FROM products ${activeOnly ? "WHERE active = 1" : ""} ORDER BY active DESC, name`)
    .all() as Product[];
}

export function saveProduct(p: { id?: number; name: string; sku: string | null; price: number; stock: number; active: boolean }) {
  if (p.id) {
    db()
      .prepare("UPDATE products SET name=?, sku=?, price=?, stock=?, active=? WHERE id=?")
      .run(p.name, p.sku, p.price, p.stock, p.active ? 1 : 0, p.id);
  } else {
    db()
      .prepare("INSERT INTO products (name, sku, price, stock, active) VALUES (?, ?, ?, ?, ?)")
      .run(p.name, p.sku, p.price, p.stock, p.active ? 1 : 0);
  }
}

// ───────────────────────── orders ─────────────────────────

const ORDER_ROW_SQL = `
  SELECT o.*, c.name AS customer_name, c.phone AS customer_phone,
    COALESCE((SELECT GROUP_CONCAT(i.name || ' ×' || i.qty, ', ') FROM order_items i WHERE i.order_id = o.id), '') AS item_summary
  FROM orders o JOIN customers c ON c.id = o.customer_id
`;

export function listOrders(opts: { status?: string; q?: string; limit?: number } = {}): OrderRow[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.status && opts.status !== "all") {
    where.push("o.status = ?");
    args.push(opts.status);
  }
  const q = opts.q?.trim();
  if (q) {
    const id = parseOrderCode(q);
    const like = `%${q}%`;
    where.push(`(c.name LIKE ? OR c.phone LIKE ? OR o.tracking_id LIKE ?${id ? " OR o.id = ?" : ""})`);
    args.push(like, like, like);
    if (id) args.push(id);
  }
  const sql = `${ORDER_ROW_SQL} ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY o.created_at DESC, o.id DESC LIMIT ?`;
  args.push(opts.limit ?? 300);
  return db().prepare(sql).all(...args) as OrderRow[];
}

export function listCustomerOrders(customerId: number): OrderRow[] {
  return db()
    .prepare(`${ORDER_ROW_SQL} WHERE o.customer_id = ? ORDER BY o.created_at DESC, o.id DESC`)
    .all(customerId) as OrderRow[];
}

export function getOrder(id: number) {
  const order = db().prepare(`${ORDER_ROW_SQL} WHERE o.id = ?`).get(id) as OrderRow | undefined;
  if (!order) return null;
  const items = db().prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id").all(id) as OrderItem[];
  const events = db()
    .prepare("SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at, id")
    .all(id) as OrderEvent[];
  return { order, items, events };
}

export function statusCounts(): Record<string, number> {
  const rows = db().prepare("SELECT status, COUNT(*) AS c FROM orders GROUP BY status").all() as {
    status: string;
    c: number;
  }[];
  const out: Record<string, number> = { all: 0 };
  for (const r of rows) {
    out[r.status] = r.c;
    out.all += r.c;
  }
  return out;
}

const STOCK_HELD = new Set(["pending", "confirmed", "packed", "shipped", "delivered"]);

export interface NewOrderInput {
  customer: { name: string; phone: string; alt_phone: string | null; address: string; district: string | null };
  source: string;
  inside_dhaka: boolean;
  items: { product_id: number | null; name: string; price: number; qty: number }[];
  discount: number;
  delivery_charge: number;
  advance_paid: number;
  advance_method: string | null;
  trx_id: string | null;
  note: string;
}

export function createOrder(input: NewOrderInput): number {
  const d = db();
  return d.transaction(() => {
    const customerId = upsertCustomer({ ...input.customer, source: input.source });
    const subtotal = input.items.reduce((s, i) => s + i.price * i.qty, 0);
    const r = d
      .prepare(
        `INSERT INTO orders (customer_id, status, source, address, district, inside_dhaka, subtotal, discount,
          delivery_charge, advance_paid, advance_method, trx_id, note)
         VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        customerId,
        input.source,
        input.customer.address,
        input.customer.district,
        input.inside_dhaka ? 1 : 0,
        subtotal,
        input.discount,
        input.delivery_charge,
        input.advance_paid,
        input.advance_method,
        input.trx_id,
        input.note,
      );
    const orderId = Number(r.lastInsertRowid);
    const insItem = d.prepare("INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)");
    const decStock = d.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
    for (const it of input.items) {
      insItem.run(orderId, it.product_id, it.name, it.price, it.qty);
      if (it.product_id) decStock.run(it.qty, it.product_id);
    }
    d.prepare("INSERT INTO order_events (order_id, status, note) VALUES (?, 'pending', '')").run(orderId);
    return orderId;
  })();
}

export function updateOrderStatus(id: number, status: OrderStatus, note = "") {
  const d = db();
  d.transaction(() => {
    const cur = d.prepare("SELECT status FROM orders WHERE id = ?").get(id) as { status: string } | undefined;
    if (!cur || cur.status === status) return;
    const wasHeld = STOCK_HELD.has(cur.status);
    const isHeld = STOCK_HELD.has(status);
    if (wasHeld !== isHeld) {
      const items = d.prepare("SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL").all(id) as {
        product_id: number;
        qty: number;
      }[];
      const upd = d.prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
      for (const it of items) upd.run(isHeld ? -it.qty : it.qty, it.product_id);
    }
    d.prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    d.prepare("INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)").run(id, status, note);
  })();
}

export function updateOrderShipping(
  id: number,
  f: { courier: string | null; tracking_id: string | null; delivery_charge: number; discount: number; advance_paid: number; advance_method: string | null; trx_id: string | null; note: string },
) {
  db()
    .prepare(
      `UPDATE orders SET courier=?, tracking_id=?, delivery_charge=?, discount=?, advance_paid=?, advance_method=?, trx_id=?, note=?,
       updated_at = datetime('now') WHERE id = ?`,
    )
    .run(f.courier, f.tracking_id, f.delivery_charge, f.discount, f.advance_paid, f.advance_method, f.trx_id, f.note, id);
}

// ───────────────────────── templates ─────────────────────────

export function listTemplates(): Template[] {
  return db().prepare("SELECT * FROM templates ORDER BY id").all() as Template[];
}

export function saveTemplate(t: { id?: number; name: string; body: string }) {
  if (t.id) db().prepare("UPDATE templates SET name=?, body=? WHERE id=?").run(t.name, t.body, t.id);
  else db().prepare("INSERT INTO templates (name, body) VALUES (?, ?)").run(t.name, t.body);
}

export function deleteTemplate(id: number) {
  db().prepare("DELETE FROM templates WHERE id = ?").run(id);
}

// ───────────────────────── dashboard ─────────────────────────

export function dashboardStats() {
  const d = db();
  const one = <T>(sql: string, ...a: unknown[]) => d.prepare(sql).get(...a) as T;

  const today = one<{ c: number; v: number }>(
    `SELECT COUNT(*) c, COALESCE(SUM(subtotal - discount + delivery_charge), 0) v FROM orders
     WHERE date(created_at, '+6 hours') = date('now', '+6 hours')`,
  );
  const pending = one<{ c: number }>(`SELECT COUNT(*) c FROM orders WHERE status = 'pending'`);
  const inTransit = one<{ c: number; v: number }>(
    `SELECT COUNT(*) c, COALESCE(SUM(MAX(subtotal - discount + delivery_charge - advance_paid, 0)), 0) v
     FROM orders WHERE status = 'shipped'`,
  );
  const month = one<{ c: number; v: number }>(
    `SELECT COUNT(*) c, COALESCE(SUM(subtotal - discount), 0) v FROM orders
     WHERE status = 'delivered' AND strftime('%Y-%m', updated_at, '+6 hours') = strftime('%Y-%m', 'now', '+6 hours')`,
  );
  const ret = one<{ delivered: number; returned: number }>(
    `SELECT COALESCE(SUM(status='delivered'),0) delivered, COALESCE(SUM(status='returned'),0) returned
     FROM orders WHERE created_at >= datetime('now', '-30 days')`,
  );
  const finished = ret.delivered + ret.returned;
  const returnRate = finished ? Math.round((ret.returned / finished) * 100) : 0;

  const byCourier = d
    .prepare(
      `SELECT courier, COUNT(*) total, SUM(status='delivered') delivered, SUM(status='returned') returned
       FROM orders WHERE courier IS NOT NULL AND courier != '' AND created_at >= datetime('now', '-30 days')
       GROUP BY courier ORDER BY total DESC`,
    )
    .all() as { courier: string; total: number; delivered: number; returned: number }[];

  const lowStock = d
    .prepare("SELECT * FROM products WHERE active = 1 AND stock <= 5 ORDER BY stock LIMIT 6")
    .all() as Product[];

  const risky = listCustomers()
    .filter((c) => c.risk.level === "high" || c.risk.level === "medium")
    .sort((a, b) => (b.risk.score ?? 0) - (a.risk.score ?? 0))
    .slice(0, 6);

  return { today, pending, inTransit, month, returnRate, byCourier, lowStock, risky, recent: listOrders({ limit: 8 }) };
}
