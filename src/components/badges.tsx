import type { Dict } from "@/lib/i18n";
import type { Risk } from "@/lib/risk";

export function StatusBadge({ status, t }: { status: string; t: Dict }) {
  const label = t[`status.${status}` as keyof Dict] ?? status;
  return <span className={`badge st-${status}`}>{label}</span>;
}

export function RiskBadge({ risk, t, blocked }: { risk: Risk; t: Dict; blocked?: boolean }) {
  if (blocked) return <span className="badge risk-high">⛔ {t["risk.blocked"]}</span>;
  const icon = { new: "✦", low: "✓", medium: "!", high: "⚠" }[risk.level];
  return (
    <span className={`badge risk-${risk.level}`} title={risk.score !== null ? `${risk.score}/100` : undefined}>
      {icon} {t[`risk.${risk.level}` as keyof Dict]}
    </span>
  );
}
