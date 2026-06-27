function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { PageTitle, Section } from "@/components/Section";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { clientAPI } from "@/lib/api";


export const Route = createFileRoute("/client/settings")({
  head: () => ({ meta: [{ title: "Company Profile · Client Admin" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const s = getSession();
  const [client, setClient] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!_optionalChain([s, 'optionalAccess', _ => _.clientId])) return;
    clientAPI.getClient(s.clientId)
      .then((profile) => setClient(profile))
      .catch((e) => setErr(e.message));
  }, [_optionalChain([s, 'optionalAccess', _2 => _2.clientId])]);

  if (!client) return <p className="py-4 text-xs text-muted-foreground font-mono">Loading...</p>;

  const handleSave = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const updated = await clientAPI.updateClient(client.id, {
        name: String(fd.get("name")),
        website: String(fd.get("website")),
      });
      setClient(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      setErr(error.message || "Failed to save");
    }
  };

  return (
    <>
      <PageTitle icon="⚙️" title="Company Profile" subtitle="Edit your tenant metadata and account preferences." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}

      <Section title="Company Metadata" endpoint="PUT /api/admin/clients/:clientId">
        <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
          <Field name="name" label="Company / Client Name" defaultValue={client.name} />
          <Field name="slug" label="Client Slug (read-only)" defaultValue={client.slug} readOnly />
          <Field name="website" label="Public Website" defaultValue={client.website} full />
          <div className="flex items-center gap-3 sm:col-span-2">
            <button className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">💾 Save Metadata Changes</button>
            {saved && <span className="text-xs text-[var(--color-success)]">✓ Saved</span>}
          </div>
        </form>
      </Section>

      <div className="h-6" />

      <Section title="Security" endpoint="PATCH /api/auth/change-password">
        <button onClick={() => setPwOpen(true)} className="rounded-md border border-border bg-surface-2 px-3 py-1.5 text-xs hover:border-primary/60">
          🔒 Change Profile Password
        </button>
      </Section>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </>
  );
}

function Field({ name, label, defaultValue, full, readOnly }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input name={name} defaultValue={defaultValue} readOnly={readOnly} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none" />
    </label>
  );
}