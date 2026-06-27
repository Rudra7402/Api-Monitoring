import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { EndpointTag } from "@/components/EndpointTag";
import { authAPI } from "@/lib/api";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "First-Run Setup · API Monitoring Portal" }] }),
  component: SetupPage,
});

function SetupPage() {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username"));
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const confirmPassword = String(fd.get("confirmPassword"));

    if (!username || !email || !password) {
      setErr("Username, Email and Password are required");
      return;
    }

    if (password !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await authAPI.onboardSuperAdmin({ username, email, password });
      setDone(true);
    } catch (error) {
      setErr(error.message || "Failed to initialize super admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 text-center">
          <div className="text-2xl">🚀</div>
          <h1 className="mt-2 text-xl font-semibold">First-Run Platform Initialization</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Create the main Super Administrator account. Shown only when no admin exists.
          </p>
        </div>
        {done ? (
          <div className="surface p-6 text-center">
            <div className="text-3xl">✓</div>
            <h2 className="mt-2 text-base font-semibold text-[var(--color-success)]">Platform initialized.</h2>
            <p className="mt-1 text-xs text-muted-foreground">Super Admin account onboarded.</p>
            <Link to="/login" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Go to Sign In →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="surface p-6 space-y-4">
            <Field name="username" label="Super Admin Username" placeholder="admin_root" />
            <Field name="email" label="Owner Email Address" placeholder="superadmin@api-monitoring.local" type="email" />
            <Field name="password" label="Initial Admin Password" type="password" />
            <Field name="confirmPassword" label="Confirm Admin Password" type="password" />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Initializing..." : "🚀 Initialize Platform & Onboard Super Admin"}
            </button>
            <EndpointTag>POST /api/auth/onboard-super-admin</EndpointTag>
          </form>
        )}
        <div className="mt-4 text-center text-[11px]">
          <Link to="/login" className="text-muted-foreground hover:text-primary">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}




) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
      />
    </label>
  );
}