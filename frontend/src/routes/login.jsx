import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DEMO_ACCOUNTS, tryLogin, homeForRole } from "@/lib/auth";
import { EndpointTag } from "@/components/EndpointTag";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign In · API Monitoring Portal" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("superadmin");
  const [password, setPassword] = useState("superadmin");
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      const s = await tryLogin(email, password);
      if (s) {
        nav({ to: homeForRole(s.role) });
      } else {
        setErr("Invalid credentials. Try a demo account below.");
      }
    } catch (error) {
      setErr(error.message || "Invalid credentials. Try a demo account below.");
    }
  };

  const quickFill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 text-2xl">🔐</div>
          <h1 className="text-xl font-semibold">API Monitoring Portal</h1>
          <p className="mt-1 text-xs text-muted-foreground">Sign in to continue</p>
        </div>

        <form onSubmit={submit} className="surface p-6">
          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Username</span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
            />
          </label>
          <label className="mt-4 block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
            />
          </label>
          {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
          <button type="submit" className="mt-5 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            🔑 Sign In securely
          </button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Rate limited: max 5 attempts / 15 minutes
          </p>
          <EndpointTag>POST /api/auth/login</EndpointTag>
        </form>

        <div className="mt-4 surface-2 p-4">
          <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Demo accounts</div>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                onClick={() => quickFill(a)}
                className="flex items-center justify-between rounded border border-border bg-surface px-3 py-2 text-left text-xs hover:border-primary/60"
              >
                <div>
                  <div className="font-semibold">{a.label}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{a.email}</div>
                </div>
                <span className="font-mono text-[10px] text-primary">use →</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex justify-between text-[11px]">
          <Link to="/setup" className="text-muted-foreground hover:text-primary">First-time setup →</Link>
          <Link to="/developer" className="text-muted-foreground hover:text-primary">Developer portal →</Link>
        </div>
      </div>
    </div>
  );
}