export function EndpointTag({ children }) {
  return (
    <p className="mt-3 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
      ↳ {children}
    </p>
  );
}