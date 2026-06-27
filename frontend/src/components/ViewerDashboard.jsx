import { useEffect, useState } from "react";
import { PageTitle, Section } from "@/components/Section";
import { MetricCard } from "@/components/MetricCard";
import { MethodBadge, Pill } from "@/components/Badge";
import { analyticsAPI } from "@/lib/api";

export function ViewerDashboard({ clientName, apiKey }) {
  const toLocalISOString = (date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  // Set default range to last 30 days so there's valid date selection
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [start, setStart] = useState(toLocalISOString(thirtyDaysAgo));
  const [end, setEnd] = useState(toLocalISOString(now));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [metrics, setMetrics] = useState({
    dashboard: null,
    responseTime: [],
    topEndpoints: [],
    statusDistribution: [],
    serviceBreakdown: [],
    errorTrend: [],
    slowest: []
  });

  const loadAll = async () => {
    if (!apiKey) return;
    setLoading(true);
    setErr(null);
    try {
      const startISO = new Date(start).toISOString();
      const endISO = new Date(end).toISOString();

      console.log("Dashboard API Key:", apiKey);
      const [
        dash,
        resTimeDist,
        topEnd,
        statusDist,
        serviceBreak,
        errTrend,
        slowest
      ] = await Promise.all([

        analyticsAPI.getDashboard(apiKey, startISO, endISO),
        analyticsAPI.getResponseTimeDistribution(apiKey, startISO, endISO),
        analyticsAPI.getTopEndpoints(apiKey, startISO, endISO, 5),
        analyticsAPI.getStatusDistribution(apiKey, startISO, endISO),
        analyticsAPI.getServiceBreakdown(apiKey, startISO, endISO),
        analyticsAPI.getErrorRateTrend(apiKey, startISO, endISO),
        analyticsAPI.getSlowestEndpoints(apiKey, startISO, endISO, 5)
      ]);

      setMetrics({
        dashboard: dash,
        responseTime: resTimeDist || [],
        topEndpoints: topEnd || [],
        statusDistribution: statusDist || [],
        serviceBreakdown: serviceBreak || [],
        errorTrend: errTrend || [],
        slowest: slowest || []
      });
    } catch (e) {
      setErr(e.message || "Failed to load metrics. Make sure the API key is active and backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [apiKey]);

  const handleApply = (e) => {
    e.preventDefault();
    loadAll();
  };

  const total = metrics.dashboard?.totalRequests || 0;

  // 1. Response time mapping
  const mappedResponseTime = metrics.responseTime.map((item) => {
    const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
    let tone = "info";
    let label = item.category;
    if (item.category.includes("fast")) {
      tone = "success";
      label = "Fast (<100ms)";
    } else if (item.category.includes("normal")) {
      tone = "info";
      label = "Normal (100-500ms)";
    } else if (item.category.includes("slow")) {
      tone = "warning";
      label = "Slow (500-1000ms)";
    } else if (item.category.includes("very slow")) {
      tone = "destructive";
      label = "Very Slow (>1000ms)";
    }
    return { label, pct, tone };
  });

  // 2. Top Endpoints mapping
  const mappedTopEndpoints = metrics.topEndpoints.map((e) => ({
    endpoint: e.endpoint,
    method: e.method,
    hits: e.totalHits,
    share: total > 0 ? Math.round((e.totalHits / total) * 100) : 0
  }));

  // 3. Status Code distribution mapping
  const mappedStatusDist = metrics.statusDistribution.map((s) => {
    let tone = "success";
    if (s.statusCode >= 500) tone = "destructive";
    else if (s.statusCode >= 400) tone = "warning";
    else if (s.statusCode >= 300) tone = "info";
    return {
      code: String(s.statusCode),
      label: s.statusCode >= 400 ? "Client/Server Error" : "Successful Request",
      hits: s.count,
      pct: s.percentage,
      tone
    };
  });

  // 4. Microservice breakdown mapping
  const mappedServices = metrics.serviceBreakdown.map((s) => ({
    name: s.serviceName,
    hits: s.totalRequests,
    errors: s.errorCount,
    latency: s.avgLatency
  }));

  // 5. Daily error rate trend mapping
  const mappedErrorTrend = metrics.errorTrend.map((d) => {
    let tone = "success";
    if (d.errorRate > 10) tone = "destructive";
    else if (d.errorRate > 3) tone = "warning";
    return {
      date: d.date,
      total: d.totalRequests,
      failed: d.errorCount,
      rate: d.errorRate,
      tone
    };
  });

  // 6. Slowest bottlenecks mapping
  const mappedSlowest = metrics.slowest.map((s) => ({
    endpoint: s.endpoint,
    method: s.method,
    avg: s.avgLatency,
    min: s.minLatency,
    max: s.maxLatency
  }));

  // Determine Tones for Metric Cards
  const successTone = metrics.dashboard?.successRate >= 95 ? "success" : metrics.dashboard?.successRate >= 85 ? "warning" : "destructive";
  const errorTone = metrics.dashboard?.errorRate < 5 ? "success" : metrics.dashboard?.errorRate < 15 ? "warning" : "destructive";

  return (
    <>
      <PageTitle icon="📊" title={`${clientName} — Metrics Dashboard`} subtitle="Read-only analytics for the tenant. Auth via x-api-key header." />

      <form onSubmit={handleApply} className="mb-6 surface p-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono text-muted-foreground">x-api-key:</span>
          <span className="rounded bg-background px-2 py-0.5 font-mono text-primary truncate max-w-[200px]" title={apiKey}>{apiKey}</span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="font-mono text-muted-foreground">From</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 font-mono text-[11px] focus:outline-none focus:border-primary"
            />
            <span className="font-mono text-muted-foreground">To</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 font-mono text-[11px] focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Loading…" : "Apply Range"}
            </button>
          </div>
        </div>
      </form>

      {err && <p className="mb-6 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded">{err}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Hits" value={metrics.dashboard ? metrics.dashboard.totalRequests : "—"} tone="info" sub="Total tracked hits" />
        <MetricCard label="Success Rate" value={metrics.dashboard ? `${metrics.dashboard.successRate}%` : "—"} tone={successTone} sub="Requests status < 400" />
        <MetricCard label="Error Rate" value={metrics.dashboard ? `${metrics.dashboard.errorRate}%` : "—"} tone={errorTone} sub={`${metrics.dashboard?.errorRequests || 0} failed hits`} />
        <MetricCard label="Avg Response" value={metrics.dashboard ? `${metrics.dashboard.avgResponseTime} ms` : "—"} tone="warning" sub={`Range: ${metrics.dashboard?.minResponseTime || 0}-${metrics.dashboard?.maxResponseTime || 0} ms`} />
      </div>
      <p className="-mt-4 mb-6 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">↳ GET /api/analytics/dashboard</p>

      {loading ? (
        <p className="py-12 text-center text-xs font-mono text-muted-foreground animate-pulse">Loading detailed charts and breakdowns...</p>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="📈 Response Time Distribution" endpoint="GET /api/analytics/response-time-distribution">
              <div className="space-y-3">
                {mappedResponseTime.length === 0 ? (
                  <p className="py-4 text-xs text-muted-foreground">No distribution records found.</p>
                ) : (
                  mappedResponseTime.map((b) => (
                    <div key={b.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>{b.label}</span>
                        <span className="font-mono tabular-nums text-muted-foreground">{b.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded bg-background">
                        <div className={`h-full ${barClass(b.tone)}`} style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="🏆 Top Endpoints" endpoint="GET /api/analytics/top-endpoints?limit=5">
              {mappedTopEndpoints.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">No api hits detected.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="border-b border-border text-left text-[10px] font-mono uppercase text-muted-foreground">
                    <tr><th className="py-1.5 pr-2">#</th><th className="py-1.5 pr-2">Endpoint</th><th className="py-1.5 pr-2">Method</th><th className="py-1.5 pr-2 text-right">Hits</th><th className="py-1.5 text-right">Share</th></tr>
                  </thead>
                  <tbody>
                    {mappedTopEndpoints.map((e, i) => (
                      <tr key={e.endpoint} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-2 font-mono">{e.endpoint}</td>
                        <td className="py-2 pr-2"><MethodBadge method={e.method} /></td>
                        <td className="py-2 pr-2 text-right font-mono tabular-nums">{e.hits}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">{e.share}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>

            <Section title="📊 HTTP Status Distribution" endpoint="GET /api/analytics/status-distribution">
              <div className="space-y-2">
                {mappedStatusDist.length === 0 ? (
                  <p className="py-4 text-xs text-muted-foreground">No status distribution records.</p>
                ) : (
                  mappedStatusDist.map((s) => (
                    <div key={s.code} className="flex items-center justify-between rounded border border-border/60 bg-background/40 px-3 py-2 text-xs">
                      <span className="flex items-center gap-2 font-mono">
                        <Pill tone={s.tone}>{s.code}</Pill>
                        {s.label}
                      </span>
                      <span className="font-mono tabular-nums text-muted-foreground">{s.hits} hits ({s.pct}%)</span>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="🛠️ Microservice Breakdown" endpoint="GET /api/analytics/service-breakdown">
              {mappedServices.length === 0 ? (
                <p className="py-4 text-xs text-muted-foreground">No active microservices registered.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="border-b border-border text-left text-[10px] font-mono uppercase text-muted-foreground">
                    <tr><th className="py-1.5 pr-2">Service</th><th className="py-1.5 pr-2 text-right">Hits</th><th className="py-1.5 pr-2 text-right">Errors</th><th className="py-1.5 text-right">Avg Latency</th></tr>
                  </thead>
                  <tbody>
                    {mappedServices.map((s) => (
                      <tr key={s.name} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-2 font-mono">{s.name}</td>
                        <td className="py-2 pr-2 text-right font-mono tabular-nums">{s.hits}</td>
                        <td className="py-2 pr-2 text-right font-mono tabular-nums text-destructive">{s.errors}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{s.latency} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>

          <div className="h-6" />

          <Section title="📅 Daily Error Rate Progression" endpoint="GET /api/analytics/error-rate-trend">
            {mappedErrorTrend.length === 0 ? (
              <p className="py-4 text-xs text-muted-foreground">No historical data available yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="border-b border-border text-left text-[10px] font-mono uppercase text-muted-foreground">
                  <tr><th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2 text-right">Total</th><th className="py-1.5 pr-2 text-right">Failed</th><th className="py-1.5 pr-2 text-right">Error Rate</th><th className="py-1.5">Trend</th></tr>
                </thead>
                <tbody>
                  {mappedErrorTrend.map((d) => (
                    <tr key={d.date} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-2 font-mono">{d.date}</td>
                      <td className="py-2 pr-2 text-right font-mono tabular-nums">{d.total.toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right font-mono tabular-nums">{d.failed}</td>
                      <td className="py-2 pr-2 text-right"><Pill tone={d.tone}>{d.rate}%</Pill></td>
                      <td className="py-2">
                        <div className="h-2 w-full overflow-hidden rounded bg-background">
                          <div className={`h-full ${barClass(d.tone)}`} style={{ width: `${Math.min(100, d.rate * 3)}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <div className="h-6" />

          <Section title="🐢 Slowest Performance Bottlenecks" endpoint="GET /api/analytics/slowest-endpoints?limit=5">
            {mappedSlowest.length === 0 ? (
              <p className="py-4 text-xs text-muted-foreground">No performance bottlenecks recorded.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="border-b border-border text-left text-[10px] font-mono uppercase text-muted-foreground">
                  <tr><th className="py-1.5 pr-2">#</th><th className="py-1.5 pr-2">Endpoint</th><th className="py-1.5 pr-2">Method</th><th className="py-1.5 pr-2 text-right">Avg</th><th className="py-1.5 pr-2 text-right">Min</th><th className="py-1.5 text-right">Max</th></tr>
                </thead>
                <tbody>
                  {mappedSlowest.map((s, i) => (
                    <tr key={s.endpoint} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-2 font-mono">{s.endpoint}</td>
                      <td className="py-2 pr-2"><MethodBadge method={s.method} /></td>
                      <td className="py-2 pr-2 text-right font-mono tabular-nums">{s.avg} ms</td>
                      <td className="py-2 pr-2 text-right font-mono tabular-nums text-muted-foreground">{s.min} ms</td>
                      <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">{s.max} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      )}
    </>
  );
}

function barClass(tone) {
  switch (tone) {
    case "success": return "bg-[var(--color-success)]";
    case "warning": return "bg-[var(--color-warning)]";
    case "destructive": return "bg-destructive";
    case "info": return "bg-[var(--color-info)]";
    default: return "bg-muted-foreground";
  }
}