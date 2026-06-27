import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { clearSession,  } from "@/lib/auth";
import { RoleBadge } from "./Badge";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { authAPI } from "@/lib/api";







export function PortalHeader({
  session,
  brand,
  brandIcon,
  nav,
}




) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (_) {
      // ignore network errors – still clear local session
    }
    clearSession();
    navigate({ to: "/login" });
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg">{brandIcon}</span>
            <span className="text-sm font-semibold tracking-tight">{brand}</span>
            <RoleBadge role={session.role} />
          </div>
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface-2"
            >
              <span className="grid size-6 place-items-center rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
                {session.username.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-mono">{session.username}</span>
              <span className="text-muted-foreground">▾</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-64 surface p-2 shadow-xl">
                <div className="px-3 py-2">
                  <div className="text-xs font-semibold">{session.username}</div>
                  <div className="text-[11px] text-muted-foreground">{session.email}</div>
                </div>
                <div className="my-1 border-t border-border" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setPwOpen(true);
                  }}
                  className="block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-surface-2"
                >
                  ⚙️ Change Password
                </button>
                <button
                  onClick={logout}
                  className="block w-full rounded px-3 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
                >
                  ⎋ Logout
                </button>
                <p className="px-3 py-1 text-[10px] font-mono text-muted-foreground">
                  GET /api/auth/profile · POST /api/auth/logout
                </p>
              </div>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4">
          {nav.map((n) => {
            const active = pathname === n.to || (n.to !== "/super" && n.to !== "/client" && pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {n.label}
                {typeof n.count === "number" && (
                  <span className="ml-1.5 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {n.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </header>
      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}