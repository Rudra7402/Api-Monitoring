import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, Section } from "@/components/Section";
import { MetricCard } from "@/components/MetricCard";
import { Modal } from "@/components/Modal";
import { Pill } from "@/components/Badge";
import { dlqAPI } from "@/lib/api";


export const Route = createFileRoute("/super/dlq")({
  head: () => ({ meta: [{ title: "DLQ Center · Super Admin" }] }),
  component: DlqPage,
});

function DlqPage() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({ pending: 0, investigated: 0, replayed: 0, deleted: 0 });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, mList] = await Promise.all([
        dlqAPI.getStats(),
        dlqAPI.getMessages(statusFilter === "all" ? undefined : statusFilter),
      ]);
      setStats(sData || { pending: 0, investigated: 0, replayed: 0, deleted: 0 });
      setMessages(mList);
    } catch (error) {
      setErr(error.message || "Failed to load DLQ data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  return (
    <>
      <PageTitle icon="💀" title="Dead Letter Queue Control Center" subtitle="Inspect, replay, or purge failed ingestion events." />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <MetricCard label="Pending" value={stats.pending} tone="warning" sub="Awaiting triage" />
        <MetricCard label="Investigated" value={stats.investigated} tone="info" sub="Under review" />
        <MetricCard label="Replayed" value={stats.replayed} tone="success" sub="Re-queued" />
        <MetricCard label="Deleted" value={stats.deleted} tone="destructive" sub="Purged" />
      </div>
      <p className="-mt-4 mb-6 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">↳ GET /api/dlq/stats</p>

      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}

      <Section
        title="Failed Message Queue"
        desc={`${messages.length} matching messages`}
        endpoint="GET /api/dlq/messages"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="investigated">Investigated</option>
              <option value="replayed">Replayed</option>
              <option value="deleted">Deleted</option>
            </select>
            <button onClick={loadData} className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs">🔍 Refresh</button>
          </div>
        }
      >
        {loading ? (
          <p className="py-4 text-xs text-muted-foreground font-mono">Loading DLQ messages...</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">Service</th>
                <th className="py-2 pr-4">Route</th>
                <th className="py-2 pr-4">Error Reason</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4 font-mono text-muted-foreground">#{m.id.slice(-8)}</td>
                  <td className="py-3 pr-4 font-mono">{m.service}</td>
                  <td className="py-3 pr-4 font-mono text-primary">{m.endpoint}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{m.reason}</td>
                  <td className="py-3 pr-4"><Pill tone={toneFor(m.status)}>{m.status}</Pill></td>
                  <td className="py-3 text-right">
                    <button onClick={() => setSelected(m)} className="rounded border border-border px-2 py-1 text-[11px] hover:border-primary/60">🔍 Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {selected && (
        <InspectorModal
          msg={selected}
          onClose={() => setSelected(null)}
          onChange={loadData}
        />
      )}
    </>
  );
}

function toneFor(status) {
  if (status === "pending") return "warning";
  if (status === "replayed") return "success";
  if (status === "deleted") return "destructive";
  return "info";
}

function InspectorModal({ msg, onClose, onChange }) {
  const [status, setStatus] = useState(msg.status);
  const [notes, setNotes] = useState(msg.notes);
  const [err, setErr] = useState(null);

  const save = async () => {
    setErr(null);
    try {
      await dlqAPI.updateMessage(msg.id, status, notes);
      onChange();
      onClose();
    } catch (error) {
      setErr(error.message || "Failed to update DLQ message");
    }
  };

  const replay = async () => {
    setErr(null);
    try {
      await dlqAPI.replayMessage(msg.id);
      onChange();
      onClose();
    } catch (error) {
      setErr(error.message || "Failed to replay message");
    }
  };

  const remove = async () => {
    setErr(null);
    try {
      await dlqAPI.deleteMessage(msg.id);
      onChange();
      onClose();
    } catch (error) {
      setErr(error.message || "Failed to delete message");
    }
  };

  return (
    <Modal title="🔍 DLQ Message Inspector" size="lg" onClose={onClose} endpoint="GET/PUT/DELETE /api/dlq/messages/:id · POST .../replay">
      <div className="space-y-4 text-xs">
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="grid grid-cols-3 gap-2 rounded-md bg-background p-3 font-mono">
          <div><span className="text-muted-foreground">ID:</span> {msg.id}</div>
          <div><span className="text-muted-foreground">Service:</span> {msg.service}</div>
          <div><span className="text-muted-foreground">Status:</span> <Pill tone={toneFor(msg.status)}>{msg.status}</Pill></div>
        </div>

        <div>
          <div className="mb-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Raw Event Payload</div>
          <pre className="overflow-x-auto rounded-md bg-background p-3 text-xs font-mono">{JSON.stringify(msg.payload, null, 2)}</pre>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Action Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value )}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono">
              <option value="pending">pending</option>
              <option value="investigated">investigated</option>
              <option value="replayed">replayed</option>
              <option value="deleted">deleted</option>
            </select>
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Investigation Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Sandbox testing request missing active sandbox currency parameters."
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        </label>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <button onClick={remove} className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
            🗑️ Delete Permanently
          </button>
          <button onClick={replay} className="rounded-md border border-[var(--color-warning)]/40 px-3 py-1.5 text-xs text-[var(--color-warning)] hover:bg-[var(--color-warning)]/10">
            🔄 Replay to Queue
          </button>
          <button onClick={save} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            💾 Update Status & Notes
          </button>
        </div>
      </div>
    </Modal>
  );
}