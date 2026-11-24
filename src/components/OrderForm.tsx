"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createOrderAction, type ActionState } from "@/app/actions";
import { DISTRICTS, PAYMENT_METHODS, isInsideDhaka, normalizePhone, phoneOperator } from "@/lib/bd";
import { fmt, money, num, SOURCES, type Dict, type Lang } from "@/lib/i18n";
import { parseOrderMessage } from "@/lib/parser";
import type { Risk } from "@/lib/risk";

interface ProductOpt {
  id: number;
  name: string;
  price: number;
  stock: number;
}
interface Item {
  product_id: number | null;
  name: string;
  price: number;
  qty: number;
}
interface LookupCustomer {
  id: number;
  name: string;
  address: string | null;
  district: string | null;
  blocked: boolean;
  orders: number;
  delivered: number;
  returned: number;
  cancelled: number;
  risk: Risk;
}

const emptyItem = (): Item => ({ product_id: null, name: "", price: 0, qty: 1 });

export function OrderForm({
  t,
  lang,
  products,
  deliveryInside,
  deliveryOutside,
}: {
  t: Dict;
  lang: Lang;
  products: ProductOpt[];
  deliveryInside: number;
  deliveryOutside: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(createOrderAction, undefined);

  const [paste, setPaste] = useState("");
  const [found, setFound] = useState<string[] | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState("");
  const [inside, setInside] = useState<boolean>(false);
  const [source, setSource] = useState("facebook");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [discount, setDiscount] = useState(0);
  const [delivery, setDelivery] = useState(deliveryOutside);
  const [deliveryTouched, setDeliveryTouched] = useState(false);
  const [advance, setAdvance] = useState(0);
  const [method, setMethod] = useState("");
  const [trx, setTrx] = useState("");
  const [note, setNote] = useState("");

  const [lookup, setLookup] = useState<LookupCustomer | null>(null);

  // Auto delivery charge by zone, unless the seller typed one.
  useEffect(() => {
    if (!deliveryTouched) setDelivery(inside ? deliveryInside : deliveryOutside);
  }, [inside, deliveryInside, deliveryOutside, deliveryTouched]);

  // Look up returning customers + their risk as soon as the phone is valid.
  const normalized = normalizePhone(phone);
  useEffect(() => {
    if (!normalized) {
      setLookup(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/customers/lookup?phone=${normalized}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { customer: LookupCustomer | null }) => {
        setLookup(d.customer);
        if (d.customer) {
          setName((n) => n || d.customer!.name);
          setAddress((a) => a || d.customer!.address || "");
          if (d.customer.district) {
            setDistrict((x) => x || d.customer!.district!);
            setInside((x) => x || isInsideDhaka(d.customer!.district));
          }
        }
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [normalized]);

  function applyPaste() {
    const p = parseOrderMessage(paste);
    setFound(p.found);
    if (p.name) setName(p.name);
    if (p.phone) setPhone(p.phone);
    if (p.altPhone) setAltPhone(p.altPhone);
    if (p.address) setAddress(p.address);
    if (p.district) setDistrict(p.district);
    if (p.insideDhaka !== null) setInside(p.insideDhaka);
    if (p.trxId) setTrx(p.trxId);
    if (p.advance) setAdvance(p.advance);
    if (p.method) setMethod(p.method);
    if (p.note) setNote(p.note);
    if (p.quantity) setItems((it) => it.map((x, i) => (i === 0 ? { ...x, qty: p.quantity! } : x)));
    if (/whatsapp|হোয়াটসঅ্যাপ/i.test(paste)) setSource("whatsapp");
  }

  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0), [items]);
  const total = subtotal - discount + delivery;
  const cod = Math.max(0, total - advance);

  const setItem = (idx: number, patch: Partial<Item>) =>
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const err = state?.error ? t[`err.${state.error}` as keyof Dict] : null;
  const op = normalized ? phoneOperator(normalized) : null;

  return (
    <form action={action} className="order-form">
      <section className="card paste-card">
        <h3>📋 {t["paste.title"]}</h3>
        <p className="muted">{t["paste.help"]}</p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={t["paste.placeholder"]}
          rows={5}
        />
        <div className="row gap">
          <button type="button" className="btn primary" onClick={applyPaste} disabled={!paste.trim()}>
            ✨ {t["paste.button"]}
          </button>
          {found &&
            (found.length ? (
              <span className="muted">
                {t["paste.found"]}: {found.map((k) => t[(k === "trxId" ? "order.trxId" : k === "quantity" ? "order.qty" : `order.${k}`) as keyof Dict] ?? k).join(", ")}
              </span>
            ) : (
              <span className="warn-text">{t["paste.nothing"]}</span>
            ))}
        </div>
      </section>

      <div className="grid-2">
        <section className="card">
          <h3>{t["order.customer"]}</h3>
          <label>
            {t["order.phone"]} *
            <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" required />
            {op && <small className="muted">{op}</small>}
          </label>

          {lookup && (
            <div className={`lookup risk-box-${lookup.blocked ? "high" : lookup.risk.level}`}>
              <strong>
                {lookup.blocked ? "⛔ " + t["risk.blocked"] : `${t["lookup.existing"]} · ${t[`risk.${lookup.risk.level}` as keyof Dict]}`}
              </strong>
              <div>
                {fmt(t["risk.history"], {
                  d: num(lookup.delivered, lang),
                  r: num(lookup.returned, lang),
                  c: num(lookup.cancelled, lang),
                })}
              </div>
              <div>{t[`risk.advice.${lookup.risk.advice}` as keyof Dict]}</div>
            </div>
          )}

          <label>
            {t["order.name"]} *
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            {t["order.altPhone"]}
            <input name="alt_phone" value={altPhone} onChange={(e) => setAltPhone(e.target.value)} inputMode="tel" />
          </label>
          <label>
            {t["order.address"]}
            <textarea name="address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </label>
          <div className="row gap">
            <label className="grow">
              {t["order.district"]}
              <select
                name="district"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setInside(isInsideDhaka(e.target.value));
                }}
              >
                <option value="">{t["order.selectDistrict"]}</option>
                {DISTRICTS.map((d) => (
                  <option key={d.en} value={d.en}>
                    {lang === "bn" ? `${d.bn} (${d.en})` : d.en}
                  </option>
                ))}
              </select>
            </label>
            <label className="grow">
              {t["order.source"]}
              <select name="source" value={source} onChange={(e) => setSource(e.target.value)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {t[`src.${s}` as keyof Dict]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="seg">
            <button type="button" className={inside ? "on" : ""} onClick={() => setInside(true)}>
              {t["order.insideDhaka"]}
            </button>
            <button type="button" className={!inside ? "on" : ""} onClick={() => setInside(false)}>
              {t["order.outsideDhaka"]}
            </button>
          </div>
          <input type="hidden" name="inside_dhaka" value={inside ? "1" : "0"} />
        </section>

        <section className="card">
          <h3>{t["order.items"]}</h3>
          {items.map((it, idx) => (
            <div key={idx} className="item-row">
              <select
                value={it.product_id ?? ""}
                onChange={(e) => {
                  const p = products.find((x) => x.id === Number(e.target.value));
                  setItem(idx, p ? { product_id: p.id, name: p.name, price: p.price } : { product_id: null });
                }}
              >
                <option value="">{t["order.customItem"]}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price, lang)} ({num(p.stock, lang)})
                  </option>
                ))}
              </select>
              <input placeholder={t["order.item"]} value={it.name} onChange={(e) => setItem(idx, { name: e.target.value })} />
              <input
                aria-label={t["order.price"]}
                type="number"
                min={0}
                value={it.price || ""}
                placeholder={t["order.price"]}
                onChange={(e) => setItem(idx, { price: Number(e.target.value) })}
              />
              <input
                aria-label={t["order.qty"]}
                type="number"
                min={1}
                value={it.qty}
                onChange={(e) => setItem(idx, { qty: Number(e.target.value) })}
              />
              {items.length > 1 && (
                <button type="button" className="btn ghost sm" onClick={() => setItems((l) => l.filter((_, i) => i !== idx))}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn ghost sm" onClick={() => setItems((l) => [...l, emptyItem()])}>
            {t["order.addItem"]}
          </button>
          <input type="hidden" name="items" value={JSON.stringify(items)} />

          <div className="totals">
            <div>
              <span>{t["order.subtotal"]}</span>
              <b>{money(subtotal, lang)}</b>
            </div>
            <label className="tot-line">
              <span>{t["order.discount"]}</span>
              <input name="discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
            </label>
            <label className="tot-line">
              <span>{t["order.delivery"]}</span>
              <input
                name="delivery_charge"
                type="number"
                min={0}
                value={delivery}
                onChange={(e) => {
                  setDeliveryTouched(true);
                  setDelivery(Number(e.target.value));
                }}
              />
            </label>
            <label className="tot-line">
              <span>{t["order.advance"]}</span>
              <input name="advance_paid" type="number" min={0} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
            </label>
            {(advance > 0 || trx) && (
              <div className="row gap">
                <select name="advance_method" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="">{t["order.method"]}</option>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <input name="trx_id" placeholder={t["order.trxId"]} value={trx} onChange={(e) => setTrx(e.target.value)} />
              </div>
            )}
            <div>
              <span>{t["order.total"]}</span>
              <b>{money(total, lang)}</b>
            </div>
            <div className="cod">
              <span>{t["order.cod"]}</span>
              <b>{money(cod, lang)}</b>
            </div>
          </div>

          <label>
            {t["order.note"]}
            <input name="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </section>
      </div>

      {err && <p className="error">{err}</p>}
      <div className="sticky-actions">
        <button className="btn primary lg" disabled={pending}>
          {pending ? "…" : "✓ " + t["order.save"]}
        </button>
      </div>
    </form>
  );
}
