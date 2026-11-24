// Fill the database with realistic demo data:  npm run seed
// Use --reset to wipe existing data first:     npm run seed -- --reset
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.HAAT_DB_PATH || path.join(process.cwd(), "data", "haat.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.sql"), "utf8"));

if (process.argv.includes("--reset")) {
  db.exec("DELETE FROM order_events; DELETE FROM order_items; DELETE FROM orders; DELETE FROM customers; DELETE FROM products;");
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('orders','customers','products','order_items','order_events');");
}

const existing = db.prepare("SELECT COUNT(*) c FROM orders").get().c;
if (existing > 0) {
  console.log(`Database already has ${existing} orders. Run "npm run seed -- --reset" to start over.`);
  process.exit(0);
}

const upsert = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
upsert.run("shop_name", "রঙধনু ফ্যাশন");
upsert.run("shop_phone", "01700000000");
upsert.run("delivery_inside", "70");
upsert.run("delivery_outside", "130");

const products = [
  ["জামদানি শাড়ি", "JS-01", 3200, 14],
  ["কটন থ্রি-পিস", "TP-02", 1450, 32],
  ["হ্যান্ডপেইন্ট পাঞ্জাবি", "PJ-03", 1650, 4],
  ["বাচ্চাদের ফ্রক", "KF-04", 650, 25],
  ["লেদার ওয়ালেট", "LW-05", 550, 0],
  ["হিজাব (৩ পিস সেট)", "HJ-06", 480, 40],
];
const insP = db.prepare("INSERT INTO products (name, sku, price, stock) VALUES (?, ?, ?, ?)");
const productIds = products.map((p) => Number(insP.run(...p).lastInsertRowid));

const customers = [
  ["নুসরাত জাহান", "01711223344", "বাসা ২৩, রোড ৭, ধানমন্ডি", "Dhaka", "facebook"],
  ["তানভীর আহমেদ", "01819876543", "সেক্টর ১১, উত্তরা", "Dhaka", "facebook"],
  ["সুমাইয়া আক্তার", "01556677889", "আগ্রাবাদ, চট্টগ্রাম", "Chattogram", "whatsapp"],
  ["রাকিব হাসান", "01912345678", "কাজীপাড়া, মিরপুর", "Dhaka", "facebook"],
  ["ফারজানা ইসলাম", "01633445566", "জিন্দাবাজার, সিলেট", "Sylhet", "instagram"],
  ["মাহমুদুল হক", "01399887766", "সাহেব বাজার, রাজশাহী", "Rajshahi", "facebook"],
  ["শারমিন সুলতানা", "01744556677", "কান্দিরপাড়, কুমিল্লা", "Cumilla", "whatsapp"],
  ["আরিফ রহমান", "01477889900", "সোনাডাঙ্গা, খুলনা", "Khulna", "facebook"],
];
const insC = db.prepare("INSERT INTO customers (name, phone, address, district, source, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))");
const customerIds = customers.map((c, i) => Number(insC.run(...c, `-${40 - i} days`).lastInsertRowid));

const insO = db.prepare(`INSERT INTO orders (customer_id, status, source, address, district, inside_dhaka, subtotal, discount, delivery_charge,
  advance_paid, advance_method, trx_id, courier, tracking_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`);
const insI = db.prepare("INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)");
const insE = db.prepare("INSERT INTO order_events (order_id, status, note, created_at) VALUES (?, ?, '', datetime('now', ?))");

// [customerIndex, status, [[productIndex, qty]...], daysAgo, courier, advance]
const plan = [
  [0, "delivered", [[0, 1]], 28, "Pathao", 0],
  [0, "delivered", [[1, 2]], 15, "Pathao", 0],
  [0, "shipped", [[5, 1], [3, 1]], 2, "Pathao", 0],
  [1, "delivered", [[2, 1]], 20, "Steadfast", 0],
  [1, "confirmed", [[1, 1]], 0, null, 0],
  [2, "delivered", [[1, 1]], 18, "Steadfast", 130],
  [2, "shipped", [[0, 1]], 3, "Steadfast", 130],
  [3, "returned", [[2, 1]], 25, "RedX", 0],
  [3, "returned", [[4, 1]], 12, "RedX", 0],
  [3, "cancelled", [[1, 1]], 6, null, 0],
  [3, "pending", [[3, 2]], 0, null, 0],
  [4, "delivered", [[5, 2]], 10, "Steadfast", 0],
  [5, "returned", [[0, 1]], 9, "Pathao", 0],
  [5, "pending", [[1, 1]], 0, null, 0],
  [6, "packed", [[3, 3]], 1, null, 130],
  [7, "pending", [[5, 1]], 0, null, 0],
  [4, "shipped", [[2, 1]], 1, "Pathao", 0],
];

const FLOW = ["pending", "confirmed", "packed", "shipped", "delivered"];
let trk = 50100;
db.transaction(() => {
  for (const [ci, status, lines, daysAgo, courier, advance] of plan) {
    const c = customers[ci];
    const inside = c[3] === "Dhaka" ? 1 : 0;
    const delivery = inside ? 70 : 130;
    const subtotal = lines.reduce((s, [pi, q]) => s + products[pi][2] * q, 0);
    const when = `-${daysAgo} days`;
    const oid = Number(
      insO.run(
        customerIds[ci], status, c[4], c[2], c[3], inside, subtotal, 0, delivery,
        advance, advance ? "bKash" : null, advance ? "9K" + Math.random().toString(36).slice(2, 10).toUpperCase() : null,
        courier, courier ? `DM${trk++}` : null, when, when,
      ).lastInsertRowid,
    );
    for (const [pi, q] of lines) insI.run(oid, productIds[pi], products[pi][0], products[pi][2], q);
    const path = status === "returned" ? ["pending", "confirmed", "shipped", "returned"]
      : status === "cancelled" ? ["pending", "cancelled"]
      : FLOW.slice(0, FLOW.indexOf(status) + 1);
    path.forEach((s, i) => insE.run(oid, s, `-${daysAgo} days`.replace(/^-(\d+)/, (_, d) => `-${Math.max(0, d - i)}`)));
  }
})();

console.log(`Seeded ${products.length} products, ${customers.length} customers, ${plan.length} orders into ${DB_PATH}`);
