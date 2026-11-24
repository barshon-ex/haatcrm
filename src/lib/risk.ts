// Fake-order / COD-return risk score.
// In Bangladesh f-commerce, a returned COD parcel costs the seller delivery + return charge.
// This score is computed from the customer's own history in YOUR shop — no data leaves your server.

export type RiskLevel = "new" | "low" | "medium" | "high";

export interface RiskInput {
  delivered: number;
  returned: number;
  cancelled: number; // cancelled after the customer confirmed (no-shows, "phone off")
}

export interface Risk {
  level: RiskLevel;
  /** 0–100, higher = riskier. null for new customers. */
  score: number | null;
  /** Suggested action key, see i18n `risk.advice.*` */
  advice: "none" | "call_first" | "take_delivery_advance" | "full_advance";
}

export function computeRisk({ delivered, returned, cancelled }: RiskInput): Risk {
  const total = delivered + returned + cancelled;
  if (total === 0) return { level: "new", score: null, advice: "call_first" };

  // Returns hurt more than cancellations (a return already cost a delivery round-trip).
  const bad = returned + 0.5 * cancelled;
  // Bayesian smoothing: pretend every customer starts with 1 good order,
  // so one return out of one order isn't instantly "100% fraud".
  const score = Math.round((bad / (total + 1)) * 100);

  if (score >= 60 || returned >= 3) return { level: "high", score, advice: "full_advance" };
  if (score >= 25) return { level: "medium", score, advice: "take_delivery_advance" };
  return { level: "low", score, advice: "none" };
}
