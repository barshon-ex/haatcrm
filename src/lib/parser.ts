// "Paste-to-order": turn a copied Messenger / WhatsApp / comment message into order fields.
// Works with Bangla, English and Banglish, Bangla or English digits, labeled or unlabeled lines.

import { detectDistrict, findPhones, findTrxId, isInsideDhaka, toEnDigits } from "./bd";

export interface ParsedOrder {
  name: string | null;
  phone: string | null;
  altPhone: string | null;
  address: string | null;
  district: string | null; // English district name
  insideDhaka: boolean | null;
  quantity: number | null;
  trxId: string | null;
  advance: number | null;
  method: string | null; // bKash / Nagad / Rocket / Upay
  note: string | null;
  /** Which fields were found, for UI hints */
  found: string[];
}

const LABELS = {
  name: ["নাম", "name", "nam", "customer", "কাস্টমার"],
  phone: ["মোবাইল", "ফোন", "নাম্বার", "নম্বর", "mobile", "phone", "number", "cell", "contact", "mob", "ph"],
  address: ["ঠিকানা", "এড্রেস", "অ্যাড্রেস", "address", "addr", "adress", "thikana", "location", "লোকেশন"],
  qty: ["পরিমাণ", "পিস", "qty", "quantity", "pcs", "piece"],
  note: ["নোট", "note", "comment", "মন্তব্য"],
  advance: ["অগ্রিম", "এডভান্স", "অ্যাডভান্স", "advance", "paid", "পেইড"],
};

function labelRe(words: string[]) {
  // label at start of a line, followed by : - = or whitespace
  return new RegExp(`^\\s*(?:${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?:\\s*[:：=\\-–]\\s*|\\s+)(.+)$`, "i");
}

function cleanLine(s: string) {
  return s.replace(/^[\s•*\-–>]+/, "").replace(/\s+/g, " ").trim();
}

// Matches BD mobiles written in English or Bangla digits, keeping the rest of the text as typed.
const PHONE_ANY_DIGITS = /(?:\+?(?:88|৮৮))?[0০]?[1১][3-9৩-৯](?:[\s-]?[0-9০-৯]){8}/g;

function stripPhones(s: string) {
  return s.replace(PHONE_ANY_DIGITS, "").replace(/\s{2,}/g, " ").replace(/^[\s,;:-]+|[\s,;:-]+$/g, "").trim();
}

export function parseOrderMessage(text: string): ParsedOrder {
  const result: ParsedOrder = {
    name: null,
    phone: null,
    altPhone: null,
    address: null,
    district: null,
    insideDhaka: null,
    quantity: null,
    trxId: null,
    advance: null,
    method: null,
    note: null,
    found: [],
  };
  if (!text || !text.trim()) return result;

  // Split on new lines and also on commas-before-labels so one-liners work:
  // "নাম: রহিম, ফোন: 017..., ঠিকানা: মিরপুর"
  const allLabels = Object.values(LABELS).flat().map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const splitter = new RegExp(`[,;।|]\\s*(?=(?:${allLabels.join("|")})\\s*[:：=])`, "gi");
  const lines = text
    .replace(splitter, "\n")
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const used = new Set<number>();

  const take = (key: keyof typeof LABELS): string | null => {
    const re = labelRe(LABELS[key]);
    for (let i = 0; i < lines.length; i++) {
      if (used.has(i)) continue;
      const m = lines[i].match(re);
      if (m && m[1].trim()) {
        used.add(i);
        return m[1].trim();
      }
    }
    return null;
  };

  const labeledName = take("name");
  const labeledPhone = take("phone");
  const labeledAddress = take("address");
  const labeledQty = take("qty");
  const labeledNote = take("note");
  const labeledAdvance = take("advance");

  // Phones — prefer the labeled one, then anything in the text.
  const phones = findPhones(labeledPhone ? labeledPhone + "\n" + text : text);
  result.phone = phones[0] ?? null;
  result.altPhone = phones[1] ?? null;

  // Lines that are ONLY a phone number are consumed.
  lines.forEach((l, i) => {
    if (!used.has(i) && findPhones(l).length && stripPhones(l).replace(/[^\p{L}]/gu, "").length < 3) used.add(i);
  });

  result.name = labeledName ? stripPhones(labeledName) : null;
  result.address = labeledAddress ? stripPhones(labeledAddress) : null;

  // Unlabeled fallback: the address is the remaining line that looks most like an address,
  // the name is a short remaining line with no digits.
  const remaining = lines.map((l, i) => ({ l, i })).filter(({ i }) => !used.has(i));
  if (!result.address) {
    const scored = remaining
      .map(({ l, i }) => {
        let s = 0;
        if (detectDistrict(l)) s += 3;
        if (/[,،]/.test(l)) s += 1;
        if (/(রোড|road|বাসা|house|বাড়ি|থানা|thana|উপজেলা|upazila|গ্রাম|village|সেক্টর|sector|ব্লক|block|লেন|lane|বাজার|bazar|মোড়|more|পোস্ট|post|জেলা|zila|district)/i.test(l)) s += 2;
        if (l.length > 20) s += 1;
        return { l, i, s };
      })
      .filter((x) => x.s >= 2)
      .sort((a, b) => b.s - a.s);
    if (scored[0]) {
      result.address = stripPhones(scored[0].l);
      used.add(scored[0].i);
    }
  }
  if (!result.name) {
    const candidate = lines
      .map((l, i) => ({ l, i }))
      .find(
        ({ l, i }) =>
          !used.has(i) &&
          !/\d/.test(toEnDigits(l)) &&
          l.length <= 40 &&
          l.split(/\s+/).length <= 5 &&
          !/(অর্ডার|order|চাই|দিবেন|দেন|লাগবে|price|দাম|কত|hi|hello|সালাম|assalam|ভাই|আপু)/i.test(l),
      );
    if (candidate) {
      result.name = candidate.l;
      used.add(candidate.i);
    }
  }

  // District + inside/outside Dhaka
  const district = detectDistrict(result.address ?? text);
  if (district) {
    result.district = district.en;
    result.insideDhaka = isInsideDhaka(district.en);
  }

  // Quantity: labeled, or "2 pcs" / "২ পিস" / "2টা"
  const qtySource = toEnDigits(labeledQty ?? text);
  const qm = labeledQty
    ? qtySource.match(/(\d{1,3})/)
    : qtySource.match(/(\d{1,3})\s*(?:pcs|pc|piece|pieces|পিস|টা(?!কা)|টি|খানা|সেট|set)/i);
  if (qm) result.quantity = Math.max(1, Number(qm[1]));

  result.trxId = findTrxId(text);

  const adv = labeledAdvance ?? toEnDigits(text).match(/(\d{2,6})\s*(?:টাকা|tk|taka|৳)?\s*(?:অগ্রিম|advance|পাঠিয়েছি|পাঠালাম|sent|দিলাম)/i)?.[1] ?? null;
  if (adv) {
    const n = Number(toEnDigits(String(adv)).replace(/[^\d]/g, ""));
    if (n > 0) result.advance = n;
  }

  if (/bkash|bikash|বিকাশ/i.test(text)) result.method = "bKash";
  else if (/nagad|নগদ/i.test(text)) result.method = "Nagad";
  else if (/rocket|রকেট/i.test(text)) result.method = "Rocket";
  else if (/upay|উপায়/i.test(text)) result.method = "Upay";

  result.note = labeledNote;

  for (const k of ["name", "phone", "address", "district", "quantity", "trxId", "advance"] as const) {
    if (result[k] !== null) result.found.push(k);
  }
  return result;
}
