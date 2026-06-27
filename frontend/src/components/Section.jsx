export function Section({
  title,
  desc,
  actions,
  children,
  endpoint,
}





) {
  return (
    <section className="surface p-5">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
        </div>
        {actions}
      </header>
      {children}
      {endpoint && (
        <p className="mt-4 border-t border-border pt-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          ↳ {endpoint}
        </p>
      )}
    </section>
  );
}

export function PageTitle({ icon, title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <span>{icon}</span>
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}