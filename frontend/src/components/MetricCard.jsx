import { StatusDot } from "./StatusDot";








export function MetricCard({ label, value, sub, tone = "muted" }) {
  return (
    <div className="surface p-5">
      <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-mono font-semibold tabular-nums text-foreground">{value}</div>
      {sub && (
        <div className="mt-2 flex items-center gap-2">
          <StatusDot tone={tone} />
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      )}
    </div>
  );
}