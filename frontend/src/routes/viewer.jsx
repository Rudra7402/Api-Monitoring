import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { PortalHeader } from "@/components/PortalHeader";
import { ViewerDashboard } from "@/components/ViewerDashboard";
import { clientAPI } from "@/lib/api";

export const Route = createFileRoute("/viewer")({
  head: () => ({ meta: [{ title: "Analytics · Viewer Dashboard" }] }),
  component: ViewerPage,
});

function ViewerPage() {
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [clientName, setClientName] = useState("Dashboard");
  const [err, setErr] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s) { nav({ to: "/login", replace: true }); return; }
    setSession(s);
    if (!s.clientId) { setErr("No client associated with this account."); return; }

    // Load the client name and their read API key
    clientAPI.getClient(s.clientId)
      .then((profile) => setClientName(profile.name || "Dashboard"))
      .catch(() => {});

    clientAPI.getApiKeys(s.clientId)
      .then((keys) => {
        const readKey = keys.find((k) => k.type === "read" && k.active);
        if (readKey) {
          setApiKey(readKey.keyValue || readKey.preview || "");
        } else {
          setErr("No active read API key found for this client. Please ask your admin to create one.");
        }
      })
      .catch((e) => setErr(e.message));
  }, [nav]);

  if (!session) return null;

  return (
    <div className="min-h-screen">
      <PortalHeader
        session={session}
        brand="Viewer Dashboard"
        brandIcon="📊"
        nav={[{ label: "📈 Metrics", to: "/viewer" }]}
      />
      <main className="mx-auto max-w-[1400px] px-6 py-8">
        {err ? (
          <p className="text-sm text-destructive">{err}</p>
        ) : !apiKey ? (
          <p className="text-xs font-mono text-muted-foreground">Loading API key…</p>
        ) : (
          <ViewerDashboard clientName={clientName} apiKey={apiKey} />
        )}
      </main>
    </div>
  );
}