import { authAPI } from "./api";









const KEY = "api-mon-session";

export function getSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) ) : null;
  } catch (e) {
    return null;
  }
}

export function setSession(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

// We can still expose the DEMO_ACCOUNTS list for UI placeholder quick-fill,
// but the actual credentials must be created/present in the database.
export const DEMO_ACCOUNTS = [
  {
    label: "Super Admin",
    email: "superadmin",
    password: "superadmin",
  },
  {
    label: "Client Admin (Zepto)",
    email: "zeptoadmin",
    password: "zeptoadmin",
  },
  {
    label: "Client Viewer (Zepto)",
    email: "zeptoclient1",
    password: "zeptoclient1",
  },
];

export async function tryLogin(username, password) {
  try {
    const user = await authAPI.login({ username, password });
    const session = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    };
    setSession(session);
    return session;
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  try {
    await authAPI.logout();
  } catch (err) {
    console.error("Logout API call failed:", err);
  } finally {
    clearSession();
  }
}

export function homeForRole(role) {
  if (role === "super_admin") return "/super";
  if (role === "client_admin") return "/client";
  return "/viewer";
}