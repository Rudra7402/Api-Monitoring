import { createFileRoute, Link } from "@tanstack/react-router";
import { StatusDot } from "@/components/StatusDot";

import { Section, PageTitle } from "@/components/Section";

export const Route = createFileRoute("/developer")({
  head: () => ({ meta: [{ title: "Developer Portal · API Monitoring" }] }),
  component: DeveloperPortal,
});

const PAYLOAD = `POST /api/hit
Headers:
  x-api-key: <YOUR_API_KEY>
  Content-Type: application/json

{
  "endpoint": "/payments/checkout",
  "method": "POST",
  "statusCode": 201,
  "responseTime": 142,
  "service": "payment-service"
}`;

const ROOT_RESPONSE = `{
  "auth": "/api/auth",
  "ingest": "/api/hit",
  "analytics": "/api/analytics"
}`;

function DeveloperPortal() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>💻</span> Developer Portal & API Docs
          </div>
          <Link to="/login" className="text-xs text-primary hover:underline">Sign in →</Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
        <PageTitle icon="💻" title="Developer Portal" subtitle="Public docs, integration guide, and system health for the API Monitoring Platform." />

        <div className="grid gap-4 md:grid-cols-2">
          <Section title="🟢 System Server" endpoint="GET /health">
            <div className="flex items-center gap-3">
              <StatusDot tone="success" />
              <div>
                <div className="font-mono text-sm">Healthy</div>
                <div className="text-xs text-muted-foreground">Uptime: 148,200s</div>
              </div>
            </div>
          </Section>
          <Section title="🟢 Ingest Engine" endpoint="GET /api/hit/health">
            <div className="flex items-center gap-3">
              <StatusDot tone="success" />
              <div>
                <div className="font-mono text-sm">Healthy</div>
                <div className="text-xs text-muted-foreground">Accepting metric events</div>
              </div>
            </div>
          </Section>
        </div>

        <Section title="📚 Root Endpoint Map" endpoint="GET /">
          <pre className="overflow-x-auto rounded-md bg-background p-4 text-xs font-mono text-foreground">{ROOT_RESPONSE}</pre>
        </Section>

        <Section title="🔌 Integrate your microservice" desc="Add this POST call inside your client API controllers to ingest hits." endpoint="POST /api/hit">
          <pre className="overflow-x-auto rounded-md bg-background p-4 text-xs font-mono text-foreground">{PAYLOAD}</pre>
        </Section>

        <footer className="pt-6 text-center text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-2"><StatusDot tone="success" /> All systems operational</span>
        </footer>
      </main>
    </div>
  );
}