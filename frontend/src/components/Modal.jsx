import { useEffect } from "react";









export function Modal({ title, onClose, endpoint, children, size = "md" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${widths[size]} surface-2 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </header>
        <div className="p-5">{children}</div>
        {endpoint && (
          <footer className="border-t border-border bg-background/40 px-5 py-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            ↳ {endpoint}
          </footer>
        )}
      </div>
    </div>
  );
}