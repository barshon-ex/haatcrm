import { describe, expect, it } from "vitest";
import { parseOrderMessage } from "@/lib/parser";
import { detectDistrict, findPhones, findTrxId, normalizePhone, phoneOperator, toEnDigits } from "@/lib/bd";
import { computeRisk } from "@/lib/risk";
import { renderTemplate } from "@/lib/messages";

describe("bd helpers", () => {
  it("converts Bangla digits", () => {
    expect(toEnDigits("০১৭১২৩৪৫৬৭৮")).toBe("01712345678");
  });

  it.each([
    ["01712345678", "01712345678"],
    ["+8801712345678", "01712345678"],
    ["8801712345678", "01712345678"],
    ["০১৭১২-৩৪৫৬৭৮", "01712345678"],
    ["017 1234 5678", "01712345678"],
    ["1712345678", "01712345678"],
    ["01212345678", null],
    ["0171234567", null],
    ["", null],
  ])("normalizePhone(%s) = %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it("finds phones in text", () => {
    expect(findPhones("call me 01712345678 or ০১৯১১২২৩৩৪৪")).toEqual(["01712345678", "01911223344"]);
  });

  it("knows operators", () => {
    expect(phoneOperator("01712345678")).toBe("Grameenphone");
    expect(phoneOperator("01312345678")).toBe("Grameenphone");
    expect(phoneOperator("01812345678")).toBe("Robi");
    expect(phoneOperator("01612345678")).toBe("Airtel");
    expect(phoneOperator("01912345678")).toBe("Banglalink");
    expect(phoneOperator("01512345678")).toBe("Teletalk");
  });

  it("detects districts in Bangla, English and old spellings", () => {
    expect(detectDistrict("আগ্রাবাদ, চট্টগ্রাম")?.en).toBe("Chattogram");
    expect(detectDistrict("Agrabad, Chittagong")?.en).toBe("Chattogram");
    expect(detectDistrict("Kandirpar, Comilla")?.en).toBe("Cumilla");
    expect(detectDistrict("House 5, Mirpur 10")?.en).toBe("Dhaka");
    expect(detectDistrict("সেক্টর ৭, উত্তরা")?.en).toBe("Dhaka");
    // last match wins: "Dhaka Road" in a Gazipur address
    expect(detectDistrict("Dhaka road, Tongi, Gazipur")?.en).toBe("Gazipur");
    expect(detectDistrict("somewhere unknown")).toBeNull();
  });

  it("finds bKash TrxIDs", () => {
    expect(findTrxId("TrxID: 9K7AB3CD2E")).toBe("9K7AB3CD2E");
    expect(findTrxId("bkash korsi trx id 8n7a6b5c4d")).toBe("8N7A6B5C4D");
    expect(findTrxId("no id here")).toBeNull();
  });
});

describe("parseOrderMessage", () => {
  it("parses a labeled Bangla message", () => {
    const p = parseOrderMessage(`নাম: রহিম উদ্দিন
মোবাইল: ০১৭১২৩৪৫৬৭৮
ঠিকানা: বাসা ১২, রোড ৫, মিরপুর ১০, ঢাকা
২ পিস`);
    expect(p.name).toBe("রহিম উদ্দিন");
    expect(p.phone).toBe("01712345678");
    expect(p.address).toBe("বাসা ১২, রোড ৫, মিরপুর ১০, ঢাকা");
    expect(p.district).toBe("Dhaka");
    expect(p.insideDhaka).toBe(true);
    expect(p.quantity).toBe(2);
  });

  it("parses a one-line English message", () => {
    const p = parseOrderMessage("Name: Sumaiya Akter, Phone: +8801556677889, Address: Agrabad, Chittagong");
    expect(p.name).toBe("Sumaiya Akter");
    expect(p.phone).toBe("01556677889");
    expect(p.address).toBe("Agrabad, Chittagong");
    expect(p.district).toBe("Chattogram");
    expect(p.insideDhaka).toBe(false);
  });

  it("parses an unlabeled message", () => {
    const p = parseOrderMessage(`Farzana Islam
01633445566
Zindabazar, Sylhet
3 pcs`);
    expect(p.name).toBe("Farzana Islam");
    expect(p.phone).toBe("01633445566");
    expect(p.address).toBe("Zindabazar, Sylhet");
    expect(p.district).toBe("Sylhet");
    expect(p.quantity).toBe(3);
  });

  it("picks up an advance payment and TrxID, and does not confuse taka with quantity", () => {
    const p = parseOrderMessage(`নাম - তানিয়া
ফোন ০১৮১৯৮৭৬৫৪৩
ঠিকানা: কান্দিরপাড়, কুমিল্লা
১৩০ টাকা অগ্রিম পাঠিয়েছি বিকাশে, TrxID 9K7AB3CD2E`);
    expect(p.name).toBe("তানিয়া");
    expect(p.phone).toBe("01819876543");
    expect(p.district).toBe("Cumilla");
    expect(p.advance).toBe(130);
    expect(p.trxId).toBe("9K7AB3CD2E");
    expect(p.quantity).toBeNull();
    expect(p.method).toBe("bKash");
  });

  it("returns empty result for empty input", () => {
    expect(parseOrderMessage("  ").found).toEqual([]);
  });
});

describe("computeRisk", () => {
  it("marks first-time customers as new", () => {
    expect(computeRisk({ delivered: 0, returned: 0, cancelled: 0 }).level).toBe("new");
  });
  it("trusts regulars", () => {
    expect(computeRisk({ delivered: 5, returned: 0, cancelled: 0 }).level).toBe("low");
  });
  it("warns after a return", () => {
    expect(computeRisk({ delivered: 1, returned: 1, cancelled: 0 }).level).toBe("medium");
  });
  it("flags serial returners", () => {
    expect(computeRisk({ delivered: 0, returned: 2, cancelled: 1 }).level).toBe("high");
    expect(computeRisk({ delivered: 10, returned: 3, cancelled: 0 }).level).toBe("high");
  });
});

describe("renderTemplate", () => {
  it("fills variables and leaves unknown ones", () => {
    const out = renderTemplate("{name} — {cod} টাকা {unknown}", {
      name: "রহিম", order: "HT-1001", items: "", total: 500, cod: 370, delivery: 70,
      courier: "", tracking: "", shop: "", shop_phone: "",
    });
    expect(out).toBe("রহিম — 370 টাকা {unknown}");
  });
});
