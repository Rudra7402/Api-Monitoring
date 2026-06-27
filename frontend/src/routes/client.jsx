import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession,  } from "@/lib/auth";
import { PortalHeader } from "@/components/PortalHeader";

export const Route = createFileRoute("/client")({
  component: ClientLayout,
});

function ClientLayout() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { nav({ to: "/login", replace: true }); return; }
    if (s.role !== "client_admin") { nav({ to: "/", replace: true }); return; }
    setSession(s);
  }, [nav]);

  if (!session) return null;

  return (
    <div className="min-h-screen">
      <PortalHeader
        session={session}
        brand="Client Admin Panel"
        brandIcon="🛡️"
        nav={[
          { label: "📈 Analytics Dashboard", to: "/client" },
          { label: "🧩 Integration Guide", to: "/client/integration" },
          { label: "👥 Team & API Keys", to: "/client/team" },
          { label: "⚙️ Company Profile", to: "/client/settings" },
        ]}
      />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}