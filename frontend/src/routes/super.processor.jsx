function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, Section } from "@/components/Section";
import { MetricCard } from "@/components/MetricCard";
import { processorAPI } from "@/lib/api";

export const Route = createFileRoute("/super/processor")({
  head: () => ({ meta: [{ title: "Engine Metrics · Super Admin" }] }),
  component: ProcessorPage,
});

function ProcessorPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const fetchMetrics = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const data = await processorAPI.getMetrics();
      setMetrics(data);
      setErr(null);
    } catch (error) {
      setErr(error.message || "Failed to fetch metrics");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics(true);
    const id = setInterval(() => fetchMetrics(false), 2000);
    return () => clearInterval(id);
  }, []);

  const totalProcessed = _nullishCoalesce(_optionalChain([metrics, 'optionalAccess', _ => _.totalProcessed]), () => ( 0));
  const rate = _nullishCoalesce(_optionalChain([metrics, 'optionalAccess', _2 => _2.messagesPerMinute]), () => ( "0.00"));
  const failureRate = _nullishCoalesce(_optionalChain([metrics, 'optionalAccess', _3 => _3.errorRate]), () => ( "0.00"));
  const totalFailed = _nullishCoalesce(_optionalChain([metrics, 'optionalAccess', _4 => _4.totalFailed]), () => ( 0));
  const totalDuplicate = _nullishCoalesce(_optionalChain([metrics, 'optionalAccess', _5 => _5.totalDuplicate]), () => ( 0));
  const lastProcessed = _optionalChain([metrics, 'optionalAccess', _6 => _6.lastProcessedTime]) ? new Date(metrics.lastProcessedTime).toLocaleTimeString() : "Never";
  const uptime = _optionalChain([metrics, 'optionalAccess', _7 => _7.uptime]) ? `${Math.round(metrics.uptime / 60000)}m ${Math.round((metrics.uptime % 60000) / 1000)}s` : "—";

  if (loading && !metrics) {
    return <p className="py-12 text-center text-xs font-mono text-muted-foreground animate-pulse">Loading engine metrics...</p>;
  }

  return (
    <>
      <PageTitle icon="📊" title="Processor Ingestion Engine" subtitle="Real-time throughput of the analytics consumer." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}
      
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total Events Processed" value={totalProcessed.toLocaleString()} tone="success" sub="Active queue listener" />
        <MetricCard label="Ingest Rate" value={`${rate} /min`} tone="info" sub="Healthy stream rate" />
        <MetricCard label="Process Failure Rate" value={`${failureRate}%`} tone="success" sub="Low rate — healthy" />
      </div>
      
      <Section title="Engine Status" endpoint="GET /api/processor/metrics">
        <div className="space-y-2 text-xs font-mono">
          <Row label="Consumer State" value="Connected" />
          <Row label="Total Failures" value={String(totalFailed)} />
          <Row label="Total Duplicates" value={String(totalDuplicate)} />
          <Row label="Last Processed Event" value={lastProcessed} />
          <Row label="Uptime" value={uptime} />
          <Row label="DLQ Pipe" value="Healthy" />
        </div>
      </Section>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}