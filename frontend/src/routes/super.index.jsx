import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, Section } from "@/components/Section";
import { Modal } from "@/components/Modal";
import { Pill, RoleBadge } from "@/components/Badge";
import { clientAPI } from "@/lib/api";


export const Route = createFileRoute("/super/")({
  head: () => ({ meta: [{ title: "Clients · Super Admin" }] }),
  component: ClientsPage,
});

function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [manage, setManage] = useState(null);
  const [err, setErr] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const list = await clientAPI.getAllClients();
      setClients(list);
    } catch (error) {
      setErr(error.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOnboard = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    // const slug = String(fd.get("slug"));
    const website = String(fd.get("website"));
    const email = String(fd.get("adminEmail")); // Maps to 'email' in backend clientData

    try {
      await clientAPI.onboardClient({ name, website, email });
      setOnboardOpen(false);
      fetchClients();
    } catch (error) {
      setErr(error.message || "Failed to onboard client");
    }
  };

  return (
    <>
      <PageTitle icon="🏢" title="Client Tenant Directory" subtitle="Onboarded tenant accounts, their users, and API keys." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}
      
      <Section
        title="Onboarded Clients"
        desc={`${clients.length} active tenants`}
        endpoint="GET /api/admin/clients"
        actions={
          <button onClick={() => setOnboardOpen(true)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            ➕ Onboard New Tenant
          </button>
        }
      >
        {loading ? (
          <p className="py-4 text-xs text-muted-foreground font-mono">Loading clients...</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Client</th>
                <th className="py-2 pr-4">Slug</th>
                <th className="py-2 pr-4">Website</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4 font-semibold">{c.name}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{c.slug}</td>
                  <td className="py-3 pr-4 font-mono text-primary">{c.website || "—"}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{c.createdAt}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => setManage(c)} className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[11px] hover:border-primary/60">
                      ⚙️ Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {onboardOpen && (
        <Modal title="➕ Onboard New Tenant Client" onClose={() => setOnboardOpen(false)} endpoint="POST /api/admin/clients/onboard">
          <form onSubmit={handleOnboard} className="space-y-3">
            <Field name="name" label="Client Name" placeholder="Acme Corp" />
            <Field name="website" label="Website" placeholder="https://acme.com" />
            <Field name="adminEmail" label="Owner/Client Contact Email" placeholder="admin@acme.com" />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOnboardOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-xs">Cancel</button>
              <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">💾 Onboard</button>
            </div>
          </form>
        </Modal>
      )}

      {manage && <ManageClientModal client={manage} onClose={() => { setManage(null); fetchClients(); }} />}
    </>
  );
}

function Field({ name, label, placeholder, defaultValue }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none" />
    </label>
  );
}

function ManageClientModal({ client, onClose }) {
  const [users, setUsers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [addUser, setAddUser] = useState(false);
  const [addKey, setAddKey] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, kList] = await Promise.all([
        clientAPI.getClientUsers(client.id),
        clientAPI.getApiKeys(client.id),
      ]);
      setUsers(uList);
      setKeys(kList);
    } catch (error) {
      setErr(error.message || "Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  const hasReadKey = keys.some((key) => key.type === "read" && key.active);

  useEffect(() => {
    loadData();
  }, [client.id]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username"));
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const role = fd.get("role") ;

    try {
      await clientAPI.createClientUser(client.id, { username, email, password, role });
      setAddUser(false);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to create user");
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    const type = fd.get("type") ;
    
    const permissions = {
      canIngest: type === "ingest" || type  === "both",
      canReadAnalytics: type === "read" || type  === "both",
    };

    try {
      const newKeyObj = await clientAPI.createApiKey(client.id, {
        name,
        permissions,
        environment: "production",
      });
      // Show created key to let the user copy it
      alert(`API Key generated successfully!\n\nPlease copy your key value now, as it cannot be shown again:\n\n${newKeyObj.preview}`);
      setAddKey(false);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to generate API key");
    }
  };

  const handleDeactivateUser = async (userId) => {
    setErr(null);
    try {
      await clientAPI.deactivateClientUser(client.id, userId);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to deactivate user");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setErr(null);
    try {
      await clientAPI.updateUserRole(client.id, userId, newRole);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to update user role");
    }
  };

  const handleRevokeKey = async (keyId) => {
    setErr(null);
    try {
      await clientAPI.revokeApiKey(client.id, keyId);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to revoke API key");
    }
  };

  return (
    <Modal title={`⚙️ Manage: ${client.name}`} size="lg" onClose={onClose}>
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}
      
      {loading ? (
        <p className="py-4 text-xs text-muted-foreground font-mono">Loading data...</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="name" label="Name" defaultValue={client.name} />
              <Field name="slug" label="Slug" defaultValue={client.slug} />
              <Field name="website" label="Website" defaultValue={client.website} />
            </div>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              ↳ PUT /api/admin/clients/:clientId
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">👥 Client Users ({users.length})</h3>
              <button onClick={() => setAddUser(true)} className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px]">➕ Create User</button>
            </div>
            <div className="surface-2 divide-y divide-border">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">{u.username}</span>
                    <span className="font-mono text-muted-foreground">({u.email})</span>
                    <RoleBadge role={u.role} />
                    {u.active ? <Pill tone="success">Active</Pill> : <Pill tone="destructive">Deactivated</Pill>}
                  </div>
                  <div className="flex items-center gap-1">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                      className="rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                    >
                      <option value="client_admin">client_admin</option>
                      <option value="client_viewer">client_viewer</option>
                    </select>
                    {u.active && (
                      <button
                        onClick={() => handleDeactivateUser(u.id)}
                        className="rounded border border-border px-2 py-1 text-[11px] hover:bg-destructive/20"
                      >🚫 Deactivate</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              ↳ GET/POST /api/admin/clients/:id/users · PATCH /api/admin/clients/:id/users/:uid/deactivate · /permissions
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🔑 API Keys ({keys.length})</h3>
              <button onClick={() => setAddKey(true)} className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px]">➕ Generate Key</button>
            </div>
            {hasReadKey && (
              <p className="mb-3 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning-foreground">
                This client already has a read API key. Use ingest keys for additional traffic sources.
              </p>
            )}
            <div className="surface-2 divide-y divide-border">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary">{k.preview}</span>
                    <Pill tone={k.type === "ingest" ? "info" : "warning"}>{k.type}</Pill>
                    {k.active ? <Pill tone="success">Active</Pill> : <Pill tone="destructive">Revoked</Pill>}
                    <span className="text-muted-foreground">Created {k.createdAt}</span>
                  </div>
                  {k.active && (
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="rounded border border-border px-2 py-1 text-[11px] hover:bg-destructive/20"
                    >🚫 Revoke</button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              ↳ GET/POST /api/admin/clients/:id/api/keys · PATCH .../:keyId/revoke
            </p>
          </div>
        </div>
      )}

      {addUser && (
        <Modal title="➕ Create Client User" onClose={() => setAddUser(false)} endpoint="POST /api/admin/clients/:clientId/users">
          <form onSubmit={handleCreateUser} className="space-y-3">
            <Field name="username" label="Username" placeholder="john_doe" />
            <Field name="email" label="Email" placeholder="john@acme.com" />
            <Field name="password" label="Password" placeholder="••••••••" />
            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Role</span>
              <select name="role" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono">
                <option value="client_admin">client_admin</option>
                <option value="client_viewer">client_viewer</option>
              </select>
            </label>
            <div className="flex justify-end pt-2">
              <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">💾 Create</button>
            </div>
          </form>
        </Modal>
      )}

      {addKey && (
        <Modal title="🔑 Generate API Key" onClose={() => setAddKey(false)} endpoint="POST /api/admin/clients/:clientId/api/keys">
          <form onSubmit={handleCreateKey} className="space-y-3">
            <Field name="name" label="Key Name" placeholder="Production Ingest Key" />
            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Type</span>
              <select name="type" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono">
                <option value="ingest">ingest</option>
                {!hasReadKey && <option value="read">read</option>}
              </select>
            </label>
            <div className="flex justify-end pt-2">
              <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">💾 Generate</button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}