import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { PageTitle, Section } from "@/components/Section";
import { clientAPI } from "@/lib/api";

export const Route = createFileRoute("/client/integration")({
  head: () => ({ meta: [{ title: "Integration Guide · Client Admin" }] }),
  component: IntegrationPage,
});

function IntegrationPage() {
  const s = getSession();
  const clientId = s?.clientId;
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [copyStatus, setCopyStatus] = useState(null);

  useEffect(() => {
    if (!clientId) return;

    const loadKeys = async () => {
      try {
        const list = await clientAPI.getApiKeys(clientId);
        setKeys(list);
      } catch (error) {
        setErr(error.message || "Failed to load API keys");
      } finally {
        setLoading(false);
      }
    };

    loadKeys();
  }, [clientId]);

  const ingestKey = keys.find((key) => key.type === "ingest" && key.active);

  const step1Code = `const axios = require('axios');

const monitoringMiddleware = (options = {}) => {
    const {
        apiKey = '${ingestKey ? ingestKey.keyValue : "apim_18471cb5e7a42904d0039c20803be253615d241b"}',
        endpoint = "https://api-monitoring-backend-iad4.onrender.com/api/hit",
        serviceName = process.env.SERVICE_NAME || 'my-service',
        enableLogging = process.env.NODE_ENV !== 'production',
        timeout = 3000,
        enabled = process.env.MONITORING_ENABLED !== 'false'
    } = options;

    if (!enabled || !apiKey) {
        if (enableLogging && !apiKey) {
            console.warn('Monitoring middleware: API key not configured');
        }
        return (req, res, next) => next();
    }

    return (req, res, next) => {
        const startTime = Date.now();
        const originalEnd = res.end;
        let sent = false;

        res.end = function (...args) {
            if (sent) return originalEnd.apply(res, args);
            sent = true;

            const monitoringData = {
                serviceName,
                endpoint: req.originalUrl || req.url,
                method: req.method,
                statusCode: res.statusCode,
                latencyMs: Date.now() - startTime,
                ip: req.ip || req.socket?.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown'
            };

            setImmediate(() => {
                sendMonitoringData(monitoringData, { apiKey, endpoint, enableLogging, timeout });
            });

            originalEnd.apply(res, args);
        };

        next();
    };
};

async function sendMonitoringData(data, options) {
    try {
        if (options.enableLogging) {
            console.log('Sending monitoring data:', {
                endpoint: data.endpoint,
                method: data.method,
                statusCode: data.statusCode,
                latencyMs: data.latencyMs
            });
        }

        await axios.post(options.endpoint, data, {
            headers: {
                'x-api-key': options.apiKey,
                'Content-Type': 'application/json'
            },
            timeout: options.timeout
        });

        if (options.enableLogging) {
            console.log('Monitoring data sent successfully');
        }
    } catch (error) {
        if (options.enableLogging) {
            if (error.response) {
                console.error('Failed to send monitoring data:', error.response.status, error.response.data?.message);
            } else {
                console.error('Failed to send monitoring data:', error.message);
            }
        }
    }
}

module.exports = monitoringMiddleware;
`;

  const step2Code = `npm install axios`;

  const step3Code = `const express = require('express');
const monitoringMiddleware = require('./monitoringMiddleware');

const app = express();

app.use(
    monitoringMiddleware({
        apiKey: '${ingestKey ? ingestKey.keyValue : "apim_18471cb5e7a42904d0039c20803be253615d241b"}',
        endpoint: 'https://api-monitoring-backend-iad4.onrender.com/api/hit',
        serviceName: 'payment-service'
    })
);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
`;

  const copySnippet = async (text, label) => {
    if (!navigator?.clipboard) {
      setCopyStatus('Clipboard unavailable in this browser.');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied!`);
      window.setTimeout(() => setCopyStatus(null), 2500);
    } catch (error) {
      setCopyStatus('Copy failed.');
    }
  };

  if (loading) {
    return <p className="text-xs font-mono py-4">Loading integration guide...</p>;
  }

  return (
    <>
      <PageTitle icon="🧩" title="Integration Guide" subtitle="Your dedicated client ingestion setup instructions." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}

      <Section
        title="Integration Guide"
        desc="Use these code snippets to wire your Express backend to the monitoring API."
      >
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] items-start">
          <div>
            <p className="text-sm text-muted-foreground">This page contains the standalone client integration guide. Copy each section separately or copy the full guide.</p>
            {!ingestKey ? (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">No active ingest key found. Create an ingest key first.</p>
            ) : (
              <p className="mt-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success-foreground">Ingest key injected into the sample code below.</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => copySnippet(`${step1Code}\n${step2Code}\n${step3Code}`, 'Full integration guide')}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Copy Full Guide
          </button>
        </div>

        {copyStatus && <p className="mb-3 text-xs text-muted-foreground">{copyStatus}</p>}

        <div className="space-y-4">
          <div className="rounded-md border border-border/50 bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Step 1: Create <code>monitoringMiddleware.js</code></h3>
              <button
                type="button"
                onClick={() => copySnippet(step1Code, 'Step 1')}
                className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/90"
              >
                Copy step 1
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-slate-950/5 p-4 text-xs font-mono text-foreground">
              {step1Code}
            </pre>
          </div>

          <div className="rounded-md border border-border/50 bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Step 2: Install axios</h3>
              <button
                type="button"
                onClick={() => copySnippet(step2Code, 'Step 2')}
                className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/90"
              >
                Copy step 2
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-slate-950/5 p-4 text-xs font-mono text-foreground">
              {step2Code}
            </pre>
          </div>

          <div className="rounded-md border border-border/50 bg-background p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Step 3: Use it in your Express app</h3>
              <button
                type="button"
                onClick={() => copySnippet(step3Code, 'Step 3')}
                className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/90"
              >
                Copy step 3
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md bg-slate-950/5 p-4 text-xs font-mono text-foreground">
              {step3Code}
            </pre>
          </div>
        </div>
      </Section>
    </>
  );
}
