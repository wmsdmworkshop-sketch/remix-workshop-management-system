import { useState } from "react";
import { KeyRound, X, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";

/** Self-service "change my password" — verifies the current password server-side. */
export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token") || "";
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const submit = async () => {
    setErr(null);
    if (next.length < 8) return setErr("New password must be at least 8 characters.");
    if (next !== confirm) return setErr("New password and confirmation do not match.");
    if (next === cur) return setErr("New password must be different from the current one.");
    setBusy(true);
    try {
      const r = await fetch("/api/my-profile/change-password", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ current_password: cur, new_password: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Failed to change password.");
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><KeyRound className="h-4 w-4 text-orange-400" /> Change Password</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-200 font-semibold">Password changed</p>
            <p className="text-xs text-zinc-500 mt-1">Use your new password next time you log in.</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded uppercase tracking-wider">Done</button>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: "Current password", val: cur, set: setCur, ph: "Enter current password" },
              { label: "New password", val: next, set: setNext, ph: "At least 8 characters" },
              { label: "Confirm new password", val: confirm, set: setConfirm, ph: "Re-enter new password" },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-[10px] font-bold uppercase text-zinc-500">{f.label}</label>
                <div className="relative mt-1">
                  <input
                    type={show ? "text" : "password"}
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setShow((s) => !s)} className="text-[11px] text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1">
              {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />} {show ? "Hide" : "Show"} passwords
            </button>

            {err && <p className="text-xs text-red-400">{err}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="px-3 py-2 text-xs font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 rounded uppercase tracking-wider">Cancel</button>
              <button onClick={submit} disabled={busy || !cur || !next || !confirm}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded uppercase tracking-wider">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />} Update
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
