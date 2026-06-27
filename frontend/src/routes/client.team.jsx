function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { PageTitle, Section } from "@/components/Section";
import { Pill, RoleBadge } from "@/components/Badge";
import { Modal } from "@/components/Modal";
import { clientAPI } from "@/lib/api";


export const Route = createFileRoute("/client/team")({
  head: () => ({ meta: [{ title: "Team · Client Admin" }] }),
  component: TeamPage,
});

function TeamPage() {
  const s = getSession();
  const clientId = _optionalChain([s, 'optionalAccess', _ => _.clientId]);
  const [users, setUsers] = useState([]);
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [keyError, setKeyError] = useState(null);
  const [copyStatus, setCopyStatus] = useState(null);
  
  const [addUser, setAddUser] = useState(false);
  const [addKey, setAddKey] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, kList] = await Promise.all([
        clientAPI.getClientUsers(clientId),
        clientAPI.getApiKeys(clientId),
      ]);
      setUsers(uList);
      setKeys(kList);
    } catch (error) {
      setErr(error.message || "Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const hasReadKey = keys.some((key) => key.type === "read" && key.active);
  const ingestKey = keys.find((key) => key.type === "ingest" && key.active);

  useEffect(() => {
    if (clientId) {
      loadData();
    }
  }, [clientId]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username"));
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    const role = fd.get("role") ;

    try {
      await clientAPI.createClientUser(clientId, { username, email, password, role });
      setAddUser(false);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to create user");
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setErr(null);
    setKeyError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name"));
    const type = fd.get("type");

    const permissions = {
      canIngest: type === "ingest" || type === "both",
      canReadAnalytics: type === "read" || type === "both",
    };

    try {
      const existingReadKey = keys.find((key) => key.type === "read" && key.active);
      if (permissions.canReadAnalytics && existingReadKey) {
        throw new Error("A read API key already exists for this client. Only one read API key is allowed per client.");
      }

      const newKeyObj = await clientAPI.createApiKey(clientId, {
        name,
        permissions,
        environment: "production",
      });
      alert(`API Key generated successfully!\n\nPlease copy your key value now, as it cannot be shown again:\n\n${newKeyObj.preview}`);
      setAddKey(false);
      loadData();
    } catch (error) {
      setKeyError(error.message || "Failed to generate API key");
    }
  };

  const handleDeactivate = async (userId) => {
    setErr(null);
    try {
      await clientAPI.deactivateClientUser(clientId, userId);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to deactivate user");
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setErr(null);
    try {
      const permissions = {
        canCreateApiKeys: newRole === "client_admin",
        canManageUsers: newRole === "client_admin",
        canViewAnalytics: true,
        canExportData: newRole === "client_admin",
      };
      await clientAPI.updatePermissions(clientId, userId, permissions);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to update permissions");
    }
  };

  const handleRevokeKey = async (keyId) => {
    setErr(null);
    try {
      await clientAPI.revokeApiKey(clientId, keyId);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to revoke API key");
    }
  };

  return (
    <>
      <PageTitle icon="🔑" title="API Keys & Team Settings" subtitle="Manage your tenant's ingestion keys and team members." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}

      {loading ? (
        <p className="py-4 text-xs text-muted-foreground font-mono">Loading team details...</p>
      ) : (
        <>
          <Section
            title="Company API Keys"
            desc={`${keys.length} keys`}
            endpoint="GET/POST/PATCH /api/admin/clients/:clientId/api/keys"
            actions={<button onClick={() => setAddKey(true)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">➕ Generate API Key</button>}
          >
            {hasReadKey && (
              <p className="mb-4 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning-foreground">
                This client already has one read API key. You can only create additional ingest keys.
              </p>
            )}
            <table className="w-full text-xs">
              <thead className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Preview</th><th className="py-2 pr-4">Permissions</th><th className="py-2 pr-4">Created</th><th className="py-2 pr-4">Status</th><th className="py-2 text-right">Action</th></tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-semibold">{k.name}</td>
                    <td className="py-3 pr-4 font-mono">{k.preview}</td>
                    <td className="py-3 pr-4"><Pill tone={k.type === "ingest" ? "info" : "warning"}>{k.type === "ingest" ? "Ingestion Only" : "Dashboard Read"}</Pill></td>
                    <td className="py-3 pr-4 font-mono text-muted-foreground">{k.createdAt}</td>
                    <td className="py-3 pr-4">{k.active ? <Pill tone="success">Active</Pill> : <Pill tone="destructive">Revoked</Pill>}</td>
                    <td className="py-3 text-right">
                      {k.active && (
                        <button onClick={() => handleRevokeKey(k.id)} className="rounded border border-border px-2 py-1 text-[11px] hover:bg-destructive/20">🚫 Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <div className="h-6" />

          <Section
            title="Team Members"
            desc={`${users.length} accounts`}
            endpoint="GET/POST/PATCH /api/admin/clients/:clientId/users"
            actions={<button onClick={() => setAddUser(true)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">➕ Add Team User</button>}
          >
            <table className="w-full text-xs">
              <thead className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2 pr-4">Username</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Permissions</th><th className="py-2 pr-4">Status</th><th className="py-2 text-right">Action</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4 font-mono font-semibold">{u.username}</td>
                    <td className="py-3 pr-4 font-mono text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4"><RoleBadge role={u.role} /></td>
                    <td className="py-3 pr-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-[11px] font-mono"
                      >
                        <option value="client_admin">Full Admin</option>
                        <option value="client_viewer">Dashboard Read</option>
                      </select>
                    </td>
                    <td className="py-3 pr-4">{u.active ? <Pill tone="success">Active</Pill> : <Pill tone="destructive">Deactivated</Pill>}</td>
                    <td className="py-3 text-right">
                      {u.active && (
                        <button onClick={() => handleDeactivate(u.id)} className="rounded border border-border px-2 py-1 text-[11px] hover:bg-destructive/20">
                          🚫 Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </>
      )}

      {addUser && (
        <Modal title="➕ Add Team User" onClose={() => setAddUser(false)} endpoint="POST /api/admin/clients/:clientId/users">
          <form onSubmit={handleCreateUser} className="grid gap-3 sm:grid-cols-2">
            <F name="username" label="Username" placeholder="john_doe" />
            <F name="email" label="Email" placeholder="john@acme.com" />
            <F name="password" label="Temporary Password" type="password" placeholder="••••••••" />
            <label className="block sm:col-span-2">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Role</span>
              <select name="role" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono">
                <option value="client_admin">client_admin</option>
                <option value="client_viewer">client_viewer</option>
              </select>
            </label>
            <div className="flex justify-end sm:col-span-2 pt-2">
              <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">💾 Create User</button>
            </div>
          </form>
        </Modal>
      )}

      {addKey && (
        <Modal title="🔑 Generate API Key" onClose={() => setAddKey(false)} endpoint="POST /api/admin/clients/:clientId/api/keys">
          <form onSubmit={handleCreateKey} className="space-y-3">
            {keyError && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">{keyError}</p>
            )}
            <F name="name" label="Key Name" placeholder="Production Key" />
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
    </>
  );
}

function F({ name, label, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input name={name} type={type} placeholder={placeholder} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none" />
    </label>
  );
}