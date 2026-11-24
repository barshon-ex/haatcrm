import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.HAAT_DB_PATH || path.join(process.cwd(), "data", "haat.db");

const SCHEMA = fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.sql"), "utf8");

export const DEFAULT_SETTINGS: Record<string, string> = {
  shop_name: "আমার দোকান",
  shop_phone: "",
  shop_page: "",
  delivery_inside: "70",
  delivery_outside: "130",
  currency_symbol: "৳",
};

export const DEFAULT_TEMPLATES: { name: string; body: string }[] = [
  {
    name: "অর্ডার কনফার্মেশন",
    body:
      "আসসালামু আলাইকুম {name}, {shop} থেকে আপনার অর্ডার {order} কনফার্ম হয়েছে।\n" +
      "পণ্য: {items}\nমোট: {total} টাকা, ডেলিভারির সময় দিবেন: {cod} টাকা।\nধন্যবাদ!",
  },
  {
    name: "পার্সেল পাঠানো হয়েছে",
    body:
      "{name}, আপনার পার্সেল {courier} এ পাঠানো হয়েছে। ট্র্যাকিং: {tracking}\n" +
      "ডেলিভারিম্যান কল করলে দয়া করে রিসিভ করবেন। ক্যাশ রেডি রাখবেন: {cod} টাকা।",
  },
  {
    name: "অগ্রিম ডেলিভারি চার্জ চাওয়া",
    body:
      "{name}, অর্ডার কনফার্ম করতে ডেলিভারি চার্জ {delivery} টাকা অগ্রিম bKash/Nagad করুন: {shop_phone}\n" +
      "টাকা পাঠিয়ে TrxID টা আমাদের জানাবেন। ধন্যবাদ!",
  },
  {
    name: "ডেলিভারির পর ধন্যবাদ",
    body: "{name}, {shop} থেকে কেনাকাটার জন্য ধন্যবাদ! পণ্য কেমন লাগলো জানালে খুশি হবো। আবার আসবেন 🙂",
  },
];

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);

  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insertSetting.run(k, v);

  const count = (db.prepare("SELECT COUNT(*) AS c FROM templates").get() as { c: number }).c;
  if (count === 0) {
    const ins = db.prepare("INSERT INTO templates (name, body) VALUES (?, ?)");
    for (const t of DEFAULT_TEMPLATES) ins.run(t.name, t.body);
  }
  return db;
}

const g = globalThis as unknown as { __haatDb?: Database.Database };

export function db(): Database.Database {
  if (!g.__haatDb) g.__haatDb = open();
  return g.__haatDb;
}
