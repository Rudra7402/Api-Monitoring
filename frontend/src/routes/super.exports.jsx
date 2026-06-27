function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, Section } from "@/components/Section";
import { Pill } from "@/components/Badge";
import { clientAPI, analyticsAPI } from "@/lib/api";


export const Route = createFileRoute("/super/exports")({
  head: () => ({ meta: [{ title: "S3 Exports · Super Admin" }] }),
  component: ExportsPage,
});





function ExportsPage() {
  const [clients, setClients] = useState([]);
  const [exportsList, setExportsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const now = Date.now();

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, eList] = await Promise.all([
        clientAPI.getAllClients(),
        analyticsAPI.getExports()
      ]);
      setClients(cList);
      setExportsList(eList);
    } catch (error) {
      setErr(error.message || "Failed to load page data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const clientId = String(fd.get("clientId"));
    const startTimeLocal = String(fd.get("start"));
    const endTimeLocal = String(fd.get("end"));

    try {
      const startTime = new Date(startTimeLocal).toISOString();
      const endTime = new Date(endTimeLocal).toISOString();
      const result = await analyticsAPI.exportAnalytics({ clientId, startTime, endTime });
      setExportsList(prev => [result, ...prev]);
    } catch (error) {
      setErr(error.message || "Failed to process export request");
    }
  };

  const handleDownload = async (item) => {
    setErr(null);
    try {
      let url = item.downloadUrl;
      if (!url) {
        url = await analyticsAPI.getExportDownloadUrl(item.id);
      }
      if (url) {
        window.open(url, "_blank");
      } else {
        throw new Error("Presigned URL could not be retrieved");
      }
    } catch (error) {
      setErr(error.message || "Failed to get download URL");
    }
  };

  const handleRegenerate = async (item) => {
    setErr(null);
    try {
      const freshUrl = await analyticsAPI.getExportDownloadUrl(item.id);
      setExportsList(prev => prev.map(job => {
        if (job.id === item.id) {
          return {
            ...job,
            downloadUrl: freshUrl,
            expiresAt: Date.now() + 60 * 60 * 1000,
          };
        }
        return job;
      }));
    } catch (error) {
      setErr(error.message || "Failed to regenerate URL");
    }
  };

  return (
    <>
      <PageTitle icon="📤" title="AWS S3 Reports Manager" subtitle="Compile tenant analytics into a CSV, push to S3, share a presigned URL." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}

      <Section title="Compile new export" endpoint="POST /api/analytics/export">
        {loading ? (
          <p className="py-2 text-xs text-muted-foreground font-mono">Loading targets...</p>
        ) : (
          <form onSubmit={handleExport} className="grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Tenant Target</span>
              <select name="clientId" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.id.slice(0, 12)}…)</option>
                ))}
              </select>
            </label>
            <Field name="start" type="datetime-local" label="Filter Start" defaultValue={toLocalISOString(new Date(Date.now() - 24 * 60 * 60 * 1000))} />
            <Field name="end" type="datetime-local" label="Filter End" defaultValue={toLocalISOString(new Date())} />
            <div className="flex items-end">
              <button type="submit" className="w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
                📤 Process & Export to S3
              </button>
            </div>
          </form>
        )}
      </Section>

      <div className="h-4" />

      <Section title="Generated presigned downloads" desc="Expire 1 hour after creation." endpoint="GET /api/analytics/exports/:exportId/url">
        <table className="w-full text-xs">
          <thead className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Export ID</th>
              <th className="py-2 pr-4">Tenant</th>
              <th className="py-2 pr-4">Records</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Expires</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {exportsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-xs text-muted-foreground font-mono">No export files compiled yet.</td>
              </tr>
            ) : (
              exportsList.map((e) => {
                const remain = Math.round((e.expiresAt - now) / 60000);
                const expired = remain <= 0;
                const tenant = clients.find((c) => c.id === e.clientId);
                return (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-mono text-muted-foreground">#{e.id.slice(0, 8)}</td>
                    <td className="py-3 pr-4">{_nullishCoalesce(_optionalChain([tenant, 'optionalAccess', _ => _.name]), () => ( "—"))}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{e.records.toLocaleString()}</td>
                    <td className="py-3 pr-4"><Pill tone={expired ? "destructive" : "success"}>{expired ? "Expired" : e.status}</Pill></td>
                    <td className="py-3 pr-4 font-mono text-muted-foreground">{expired ? "—" : `${remain} mins left`}</td>
                    <td className="py-3 text-right">
                      {expired ? (
                        <button
                          onClick={() => handleRegenerate(e)}
                          className="rounded border border-border px-2 py-1 text-[11px] hover:border-primary/60"
                        >🔄 Regenerate Link</button>
                      ) : (
                        <button
                          onClick={() => handleDownload(e)}
                          className="rounded border border-primary/40 px-2 py-1 text-[11px] text-primary hover:bg-primary/10"
                        >⬇️ Download CSV</button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Section>
    </>
  );
}

const toLocalISOString = (date) => {
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

function Field({ name, label, defaultValue, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input type={type} name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono" />
    </label>
  );
}