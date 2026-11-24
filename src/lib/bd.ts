// Bangladesh-specific helpers: Bangla digits, phone numbers, districts, couriers.
// Pure functions only — safe to import in both server and client code.

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

/** Convert Bangla digits (০-৯) to ASCII digits. Leaves everything else untouched. */
export function toEnDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Convert ASCII digits to Bangla digits. */
export function toBnDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/**
 * Normalize a Bangladeshi mobile number to the 11-digit local form 01XXXXXXXXX.
 * Accepts Bangla digits, spaces, dashes, +880 / 880 / 0880 prefixes.
 * Returns null when the input is not a valid BD mobile number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = toEnDigits(raw).replace(/\D/g, "");
  if (d.startsWith("00880")) d = d.slice(4);
  if (d.startsWith("880")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

/** Find every valid BD mobile number in a free-text blob (Bangla or English digits). */
export function findPhones(text: string): string[] {
  const t = toEnDigits(text);
  const out = new Set<string>();
  const re = /(?:\+?88)?0?1[3-9](?:[\s-]?\d){8}/g;
  for (const m of t.match(re) ?? []) {
    const p = normalizePhone(m);
    if (p) out.add(p);
  }
  return [...out];
}

export type Operator = "Grameenphone" | "Robi" | "Airtel" | "Banglalink" | "Teletalk";

export function phoneOperator(phone: string): Operator | null {
  const p = normalizePhone(phone);
  if (!p) return null;
  const prefix = p.slice(0, 3);
  switch (prefix) {
    case "017":
    case "013":
      return "Grameenphone";
    case "018":
      return "Robi";
    case "016":
      return "Airtel";
    case "019":
    case "014":
      return "Banglalink";
    case "015":
      return "Teletalk";
    default:
      return null;
  }
}

/** International format for wa.me links: 8801XXXXXXXXX */
export function waNumber(phone: string): string | null {
  const p = normalizePhone(phone);
  return p ? "88" + p : null;
}

export interface District {
  en: string;
  bn: string;
  division: string;
  aliases?: string[];
}

// All 64 districts of Bangladesh.
export const DISTRICTS: District[] = [
  // Dhaka
  { en: "Dhaka", bn: "ঢাকা", division: "Dhaka" },
  { en: "Gazipur", bn: "গাজীপুর", division: "Dhaka", aliases: ["গাজিপুর"] },
  { en: "Narayanganj", bn: "নারায়ণগঞ্জ", division: "Dhaka", aliases: ["নারায়নগঞ্জ"] },
  { en: "Narsingdi", bn: "নরসিংদী", division: "Dhaka" },
  { en: "Munshiganj", bn: "মুন্সীগঞ্জ", division: "Dhaka", aliases: ["মুন্সিগঞ্জ"] },
  { en: "Manikganj", bn: "মানিকগঞ্জ", division: "Dhaka" },
  { en: "Tangail", bn: "টাঙ্গাইল", division: "Dhaka" },
  { en: "Kishoreganj", bn: "কিশোরগঞ্জ", division: "Dhaka" },
  { en: "Faridpur", bn: "ফরিদপুর", division: "Dhaka" },
  { en: "Gopalganj", bn: "গোপালগঞ্জ", division: "Dhaka" },
  { en: "Madaripur", bn: "মাদারীপুর", division: "Dhaka" },
  { en: "Rajbari", bn: "রাজবাড়ী", division: "Dhaka" },
  { en: "Shariatpur", bn: "শরীয়তপুর", division: "Dhaka" },
  // Chattogram
  { en: "Chattogram", bn: "চট্টগ্রাম", division: "Chattogram", aliases: ["Chittagong", "Ctg"] },
  { en: "Cox's Bazar", bn: "কক্সবাজার", division: "Chattogram", aliases: ["Coxs Bazar", "Cox Bazar"] },
  { en: "Cumilla", bn: "কুমিল্লা", division: "Chattogram", aliases: ["Comilla"] },
  { en: "Feni", bn: "ফেনী", division: "Chattogram" },
  { en: "Noakhali", bn: "নোয়াখালী", division: "Chattogram" },
  { en: "Lakshmipur", bn: "লক্ষ্মীপুর", division: "Chattogram", aliases: ["Laxmipur"] },
  { en: "Chandpur", bn: "চাঁদপুর", division: "Chattogram" },
  { en: "Brahmanbaria", bn: "ব্রাহ্মণবাড়িয়া", division: "Chattogram" },
  { en: "Rangamati", bn: "রাঙ্গামাটি", division: "Chattogram" },
  { en: "Khagrachhari", bn: "খাগড়াছড়ি", division: "Chattogram", aliases: ["Khagrachari"] },
  { en: "Bandarban", bn: "বান্দরবান", division: "Chattogram" },
  // Rajshahi
  { en: "Rajshahi", bn: "রাজশাহী", division: "Rajshahi" },
  { en: "Bogura", bn: "বগুড়া", division: "Rajshahi", aliases: ["Bogra"] },
  { en: "Pabna", bn: "পাবনা", division: "Rajshahi" },
  { en: "Sirajganj", bn: "সিরাজগঞ্জ", division: "Rajshahi" },
  { en: "Natore", bn: "নাটোর", division: "Rajshahi" },
  { en: "Naogaon", bn: "নওগাঁ", division: "Rajshahi" },
  { en: "Chapainawabganj", bn: "চাঁপাইনবাবগঞ্জ", division: "Rajshahi", aliases: ["Chapai Nawabganj", "Chapai"] },
  { en: "Joypurhat", bn: "জয়পুরহাট", division: "Rajshahi" },
  // Khulna
  { en: "Khulna", bn: "খুলনা", division: "Khulna" },
  { en: "Jashore", bn: "যশোর", division: "Khulna", aliases: ["Jessore"] },
  { en: "Satkhira", bn: "সাতক্ষীরা", division: "Khulna" },
  { en: "Bagerhat", bn: "বাগেরহাট", division: "Khulna" },
  { en: "Kushtia", bn: "কুষ্টিয়া", division: "Khulna" },
  { en: "Jhenaidah", bn: "ঝিনাইদহ", division: "Khulna" },
  { en: "Magura", bn: "মাগুরা", division: "Khulna" },
  { en: "Narail", bn: "নড়াইল", division: "Khulna" },
  { en: "Chuadanga", bn: "চুয়াডাঙ্গা", division: "Khulna" },
  { en: "Meherpur", bn: "মেহেরপুর", division: "Khulna" },
  // Barishal
  { en: "Barishal", bn: "বরিশাল", division: "Barishal", aliases: ["Barisal"] },
  { en: "Bhola", bn: "ভোলা", division: "Barishal" },
  { en: "Patuakhali", bn: "পটুয়াখালী", division: "Barishal" },
  { en: "Pirojpur", bn: "পিরোজপুর", division: "Barishal" },
  { en: "Barguna", bn: "বরগুনা", division: "Barishal" },
  { en: "Jhalokati", bn: "ঝালকাঠি", division: "Barishal", aliases: ["Jhalakathi"] },
  // Sylhet
  { en: "Sylhet", bn: "সিলেট", division: "Sylhet" },
  { en: "Moulvibazar", bn: "মৌলভীবাজার", division: "Sylhet" },
  { en: "Habiganj", bn: "হবিগঞ্জ", division: "Sylhet" },
  { en: "Sunamganj", bn: "সুনামগঞ্জ", division: "Sylhet" },
  // Rangpur
  { en: "Rangpur", bn: "রংপুর", division: "Rangpur" },
  { en: "Dinajpur", bn: "দিনাজপুর", division: "Rangpur" },
  { en: "Kurigram", bn: "কুড়িগ্রাম", division: "Rangpur" },
  { en: "Gaibandha", bn: "গাইবান্ধা", division: "Rangpur" },
  { en: "Nilphamari", bn: "নীলফামারী", division: "Rangpur" },
  { en: "Lalmonirhat", bn: "লালমনিরহাট", division: "Rangpur" },
  { en: "Thakurgaon", bn: "ঠাকুরগাঁও", division: "Rangpur" },
  { en: "Panchagarh", bn: "পঞ্চগড়", division: "Rangpur" },
  // Mymensingh
  { en: "Mymensingh", bn: "ময়মনসিংহ", division: "Mymensingh" },
  { en: "Jamalpur", bn: "জামালপুর", division: "Mymensingh" },
  { en: "Sherpur", bn: "শেরপুর", division: "Mymensingh" },
  { en: "Netrokona", bn: "নেত্রকোণা", division: "Mymensingh", aliases: ["Netrakona", "নেত্রকোনা"] },
];

/** Well-known Dhaka city areas — a hit here means "inside Dhaka" delivery. */
export const DHAKA_AREAS = [
  "Mirpur", "Uttara", "Dhanmondi", "Gulshan", "Banani", "Mohammadpur", "Badda", "Rampura",
  "Motijheel", "Jatrabari", "Bashundhara", "Khilgaon", "Tejgaon", "Farmgate", "Malibagh",
  "Mohakhali", "Lalbagh", "Shyamoli", "Azimpur", "Karwan Bazar", "Wari", "Shantinagar",
  "মিরপুর", "উত্তরা", "ধানমন্ডি", "গুলশান", "বনানী", "মোহাম্মদপুর", "বাড্ডা", "রামপুরা",
  "মতিঝিল", "যাত্রাবাড়ী", "বসুন্ধরা", "খিলগাঁও", "তেজগাঁও", "ফার্মগেট", "মালিবাগ",
  "মহাখালী", "লালবাগ", "শ্যামলী", "আজিমপুর", "কারওয়ান বাজার", "ওয়ারী", "শান্তিনগর",
];

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect the district mentioned in an address. If several match, the one that
 * appears LAST wins (addresses usually end with the district).
 */
export function detectDistrict(text: string): District | null {
  let best: { d: District; idx: number } | null = null;
  const lower = text.toLowerCase();
  for (const d of DISTRICTS) {
    for (const name of [d.en, d.bn, ...(d.aliases ?? [])]) {
      const isLatin = /^[\x00-\x7F]+$/.test(name);
      let idx = -1;
      if (isLatin) {
        const re = new RegExp(`\\b${escapeRe(name.toLowerCase())}\\b`, "g");
        let m: RegExpExecArray | null;
        while ((m = re.exec(lower))) idx = m.index;
      } else {
        idx = text.lastIndexOf(name);
      }
      if (idx >= 0 && (!best || idx > best.idx)) best = { d, idx };
    }
  }
  if (best) return best.d;
  // No district name but a Dhaka city area is mentioned.
  for (const a of DHAKA_AREAS) {
    if (lower.includes(a.toLowerCase())) return DISTRICTS[0];
  }
  return null;
}

export function isInsideDhaka(district: string | null | undefined): boolean {
  if (!district) return false;
  return district === "Dhaka" || district === "ঢাকা";
}

export function districtLabel(en: string | null | undefined, lang: "bn" | "en"): string {
  if (!en) return "";
  const d = DISTRICTS.find((x) => x.en === en);
  if (!d) return en;
  return lang === "bn" ? d.bn : d.en;
}

export const COURIERS = ["Pathao", "Steadfast", "RedX", "Paperfly", "Sundarban", "eCourier", "Self"] as const;
export type Courier = (typeof COURIERS)[number];

/** Public tracking page for a courier, when one exists. */
export function trackingUrl(courier: string | null, trackingId: string | null): string | null {
  if (!courier || !trackingId) return null;
  const id = encodeURIComponent(trackingId);
  switch (courier) {
    case "Steadfast":
      return `https://steadfast.com.bd/t/${id}`;
    case "Pathao":
      return `https://merchant.pathao.com/tracking?consignment_id=${id}`;
    case "RedX":
      return `https://redx.com.bd/track-parcel/?trackingId=${id}`;
    default:
      return null;
  }
}

export const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket", "Upay", "Bank", "Cash"] as const;

/** bKash/Nagad style transaction IDs: 8–12 uppercase alphanumerics with at least one letter and one digit. */
export function findTrxId(text: string): string | null {
  const t = toEnDigits(text);
  const labeled = t.match(/(?:trx\s*id|trxid|txn\s*id|transaction\s*id|ট্রানজেকশন|ট্রানজ্যাকশন)\s*[:：#-]?\s*([A-Za-z0-9]{8,12})/i);
  if (labeled) return labeled[1].toUpperCase();
  const bare = t.match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*\d)[A-Z0-9]{10}\b/);
  return bare ? bare[0] : null;
}
