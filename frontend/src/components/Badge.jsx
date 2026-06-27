const roleStyles = {
  super_admin: "border-[var(--color-warning)]/40 text-[var(--color-warning)] bg-[var(--color-warning)]/10",
  client_admin: "border-primary/40 text-primary bg-primary/10",
  client_viewer: "border-[var(--color-info)]/40 text-[var(--color-info)] bg-[var(--color-info)]/10",
};

export function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${roleStyles[role]}`}>
      {role}
    </span>
  );
}

export function Pill({ tone = "muted", children }) {
  const styles = {
    muted: "border-border text-muted-foreground bg-muted/40",
    success: "border-[var(--color-success)]/40 text-[var(--color-success)] bg-[var(--color-success)]/10",
    destructive: "border-destructive/40 text-destructive bg-destructive/10",
    warning: "border-[var(--color-warning)]/40 text-[var(--color-warning)] bg-[var(--color-warning)]/10",
    info: "border-[var(--color-info)]/40 text-[var(--color-info)] bg-[var(--color-info)]/10",
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${styles[tone]}`}>
      {children}
    </span>
  );
}

export function MethodBadge({ method }) {
  const colorMap = {
    GET: "info",
    POST: "success",
    PUT: "warning",
    PATCH: "warning",
    DELETE: "destructive",
  };
  return <Pill tone={(colorMap[method] ) || "muted"}>{method}</Pill>;
}