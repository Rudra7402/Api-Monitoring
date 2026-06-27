const colorMap = {
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  destructive: "bg-destructive",
  info: "bg-[var(--color-info)]",
  muted: "bg-muted-foreground",
};

export function StatusDot({ tone = "success", label, mono }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block size-2 rounded-full ${colorMap[tone]} shadow-[0_0_8px_currentColor]`} />
      {label && <span className={mono ? "font-mono text-xs" : "text-xs"}>{label}</span>}
    </span>
  );
}