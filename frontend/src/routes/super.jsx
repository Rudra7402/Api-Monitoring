function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession,  } from "@/lib/auth";
import { PortalHeader } from "@/components/PortalHeader";
import { clientAPI, authAPI, dlqAPI } from "@/lib/api";

export const Route = createFileRoute("/super")({
  component: SuperLayout,
});

function SuperLayout() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [counts, setCounts] = useState({ clients: 0, users: 0, dlq: 0 });

  useEffect(() => {
    const s = getSession();
    if (!s) { nav({ to: "/login", replace: true }); return; }
    if (s.role !== "super_admin") { nav({ to: "/", replace: true }); return; }
    setSession(s);

    // Fetch counts
    const fetchCounts = async () => {
      try {
        const [clients, users, dlqStats] = await Promise.all([
          clientAPI.getAllClients(),
          authAPI.getAllUsers(),
          dlqAPI.getStats(),
        ]);
        setCounts({
          clients: clients.length,
          users: users.length,
          dlq: _optionalChain([dlqStats, 'optionalAccess', _ => _.pending]) || 0,
        });
      } catch (err) {
        console.error("Failed to load navigation counts:", err);
      }
    };
    fetchCounts();
  }, [nav]);

  if (!session) return null;

  return (
    <div className="min-h-screen">
      <PortalHeader
        session={session}
        brand="Super Admin Console"
        brandIcon="👑"
        nav={[
          { label: "🏢 Clients", to: "/super", count: counts.clients },
          { label: "👥 Platform Users", to: "/super/users", count: counts.users },
          { label: "💀 DLQ Center", to: "/super/dlq", count: counts.dlq },
          { label: "📊 Engine Metrics", to: "/super/processor" },
          { label: "📤 S3 Exports", to: "/super/exports" },
        ]}
      />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}