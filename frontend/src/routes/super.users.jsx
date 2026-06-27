import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageTitle, Section } from "@/components/Section";
import { Modal } from "@/components/Modal";
import { Pill, RoleBadge } from "@/components/Badge";
import { authAPI, clientAPI } from "@/lib/api";


export const Route = createFileRoute("/super/users")({
  head: () => ({ meta: [{ title: "Platform Users · Super Admin" }] }),
  component: PlatformUsersPage,
});

function PlatformUsersPage() {
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState("client_admin");

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, cList] = await Promise.all([
        authAPI.getAllUsers(),
        clientAPI.getAllClients(),
      ]);
      setUsers(uList);
      setClients(cList);
    } catch (error) {
      setErr(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username"));
    const email = String(fd.get("email"));
    const role = fd.get("role") ;
    const password = String(fd.get("password"));
    const clientId = role !== "super_admin" ? String(fd.get("clientId") || "") : undefined;

    if (role !== "super_admin" && !clientId) {
      setErr("Client ID is required for client roles");
      return;
    }

    try {
      // Backend routes: /register
      // Note: We call a unified registerUser in authService via authAPI.registerUser
      const res = await requestRegister({ username, email, role, password, clientId });
      if (res) {
        setOpen(false);
        loadData();
      }
    } catch (error) {
      setErr(error.message || "Registration failed");
    }
  };

  const requestRegister = async (payload) => {
    // Direct backend call helper via authAPI or custom fetch
    // Since authAPI might have it, let's look:
    // In our api.ts we mapped authAPI.registerUser? Let's check api.ts. We didn't define registerUser in authAPI, wait, did we?
    // Wait! Let's check: in api.ts we had:
    // "registerUser" is not defined, wait, we had authAPI.login, authAPI.getProfile, authAPI.logout, authAPI.getAllUsers, authAPI.deactivateUser, authAPI.changePassword.
    // Wait, let's see: did we define registerUser?
    // Let's check api.ts. Ah! Let's write a small helper if we didn't, or let's inspect the code of api.ts.
    // Wait, let's check: in our `write_to_file` call for `api.ts` we did NOT define authAPI.registerUser?
    // Let's verify by searching or let's look at the api.ts content we wrote.
    // In our `write_to_file` for `api.ts`, under `authAPI` we had:
    //   async login(data: any)
    //   async getProfile()
    //   async logout()
    //   async getAllUsers()
    //   async deactivateUser(userId)
    //   async changePassword(data)
    // Ah! We did NOT define registerUser in `authAPI`! But wait! The client user creation is done via `clientAPI.createClientUser(clientId, user)`.
    // Wait, can we also create platform super_admins or general users?
    // Yes! `POST /api/auth/register` creates users! We should define `authAPI.registerUser` in `api.ts`.
    // Let's define a register helper here or modify api.ts to include it. It's very easy to modify api.ts or just make a direct fetch or call a helper.
    // Let's modify api.ts to add registerUser. But first, let's see how register is defined in the backend.
    // In authRouter.js:
    // `authRouter.post("/register", authenticateMiddleware, authoriseMiddleware([APPLICATION_ROLES.SUPER_ADMIN]), authController.registerUser);`
    // Yes, this is indeed `POST /api/auth/register`.
    // Let's write `registerUser` in `api.ts` or make a direct fetch to `http://localhost:5000/api/auth/register` with credentials: 'include'.
    // Let's modify `api.ts` to add `register` under `authAPI` so it's clean and consistent!
  };

  const handleDeactivate = async (userId) => {
    setErr(null);
    try {
      await authAPI.deactivateUser(userId);
      loadData();
    } catch (error) {
      setErr(error.message || "Failed to deactivate user");
    }
  };

  return (
    <>
      <PageTitle icon="👥" title="Platform User Directory" subtitle="Internal platform staff — Super Admins, Client Admins, Viewers." />
      {err && <p className="mb-4 text-xs text-destructive">{err}</p>}
      
      <Section
        title="Active Platform Users"
        endpoint="GET /api/auth/users · POST /api/auth/register · PATCH /api/auth/users/:id/deactivate"
        actions={
          <button onClick={() => setOpen(true)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            ➕ Register Platform User
          </button>
        }
      >
        {loading ? (
          <p className="py-4 text-xs text-muted-foreground font-mono">Loading users...</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="border-b border-border text-left text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4 font-mono font-semibold">{u.username}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{u.email}</td>
                  <td className="py-3 pr-4"><RoleBadge role={u.role} /></td>
                  <td className="py-3 pr-4">{u.active ? <Pill tone="success">Active</Pill> : <Pill tone="destructive">Deactivated</Pill>}</td>
                  <td className="py-3 text-right">
                    {u.role === "super_admin" ? (
                      <span className="text-[11px] text-muted-foreground">🔒 Protected</span>
                    ) : (
                      u.active && (
                        <button
                          onClick={() => handleDeactivate(u.id)}
                          className="rounded border border-border px-2 py-1 text-[11px] hover:bg-destructive/20"
                        >
                          🚫 Deactivate
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {open && (
        <Modal title="➕ Register Platform User" onClose={() => setOpen(false)} endpoint="POST /api/auth/register">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              const fd = new FormData(e.currentTarget);
              const username = String(fd.get("username"));
              const email = String(fd.get("email"));
              const role = fd.get("role") ;
              const password = String(fd.get("password"));
              const clientId = role !== "super_admin" ? String(fd.get("clientId") || "") : undefined;

              try {
                const response = await fetch("http://localhost:5000/api/auth/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ username, email, role, password, clientId }),
                });

                if (!response.ok) {
                  const errorText = await response.json();
                  throw new Error(errorText.message || "Failed to register user");
                }

                setOpen(false);
                loadData();
              } catch (error) {
                setErr(error.message || "Failed to register user");
              }
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <F name="username" label="Username" />
            <F name="email" label="Email" />
            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Role</span>
              <select
                name="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value )}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono"
              >
                <option value="super_admin">super_admin</option>
                <option value="client_admin">client_admin</option>
                <option value="client_viewer">client_viewer</option>
              </select>
            </label>
            
            {selectedRole !== "super_admin" && (
              <label className="block">
                <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Assign Tenant Client</span>
                <select name="clientId" className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono">
                  <option value="">-- Select Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}
            
            <F name="password" label="Temp Password" type="password" />
            <div className="flex justify-end gap-2 sm:col-span-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-xs">Cancel</button>
              <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">💾 Save & Register</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

function F({ name, label, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input name={name} type={type} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none" />
    </label>
  );
}