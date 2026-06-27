function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { ViewerDashboard } from "@/components/ViewerDashboard";
import { clientAPI } from "@/lib/api";

export const Route = createFileRoute("/client/")({
  head: () => ({ meta: [{ title: "Analytics · Client Admin" }] }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const s = getSession();
  const [apiKey, setApiKey] = useState("");
  const [clientName, setClientName] = useState("Client Organization");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!_optionalChain([s, 'optionalAccess', _ => _.clientId])) return;

    clientAPI.getClient(s.clientId)
      .then((profile) => setClientName(profile.name || "Client Organization"))
      .catch(() => {});

    const loadKeys = async () => {
      try {
        const list = await clientAPI.getApiKeys(s.clientId);
        const readKey = list.find((k) => k.type === "read" && k.active);
        if (readKey) {
          setApiKey(readKey.keyValue || readKey.preview || "");
        } else {
          setErr("No active read API key found for this client. Please ask your admin to create one.");
        }
      } catch (err) {
        console.error("Failed to load API keys:", err);
        setErr(err.message || "Failed to load API keys.");
      } finally {
        setLoading(false);
      }
    };
    loadKeys();
  }, [_optionalChain([s, 'optionalAccess', _2 => _2.clientId])]);

  if (loading) {
    return <p className="text-xs font-mono py-4">Loading Dashboard...</p>;
  }

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }

  return <ViewerDashboard clientName={clientName} apiKey={apiKey} />;
}