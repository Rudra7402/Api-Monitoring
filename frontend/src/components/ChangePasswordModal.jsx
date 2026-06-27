import { Modal } from "./Modal";
import { useState } from "react";
import { authAPI } from "@/lib/api";

export function ChangePasswordModal({ open, onClose }) {
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const currentPassword = String(fd.get("current"));
    const newPassword = String(fd.get("newpw"));
    const confirm = String(fd.get("confirm"));

    if (newPassword !== confirm) {
      setErr("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({ oldPassword: currentPassword, newPassword });
      setDone(true);
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1000);
    } catch (error) {
      setErr(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="🔒 Change Profile Password" onClose={onClose} endpoint="PATCH /api/auth/change-password">
      {done ? (
        <p className="text-sm text-[var(--color-success)]">✓ Password updated. Please re-login if prompted.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Field name="current" label="Current Password" type="password" />
          <Field name="newpw" label="New Password" type="password" />
          <Field name="confirm" label="Confirm New Password" type="password" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface-2">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {loading ? "Saving…" : "💾 Update Password"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({ name, label, type = "text" }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm font-mono focus:border-primary focus:outline-none"
      />
    </label>
  );
}