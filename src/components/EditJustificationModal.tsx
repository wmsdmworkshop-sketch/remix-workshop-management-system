import React, { useState } from "react";
import { X, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  /** What is being edited, e.g. "KA32AB0307 — intake" or "Employee: Shashi". */
  entityLabel: string;
  /** Optional heading override. */
  title?: string;
  /** Called with the trimmed justification; may be async. Throw to show an error. */
  onConfirm: (justification: string) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Reusable "reason for this change" gate. Every edit in DWIP must be justified
 * (self-reason recorded to the audit trail) — this modal captures that reason
 * before the edit proceeds. Reused across all edit surfaces.
 */
export const EditJustificationModal: React.FC<Props> = ({ entityLabel, title, onConfirm, onClose }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    const r = reason.trim();
    if (r.length < 5) { setError("Please enter a clear reason (at least 5 characters)."); return; }
    setBusy(true); setError(null);
    try {
      await onConfirm(r);
    } catch (e: any) {
      setError(e?.message || "Failed to record the edit.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-600/40 text-slate-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
            <ShieldAlert className="h-4 w-4" /> {title || "Justification Required"}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400">
            Editing <span className="font-bold text-slate-200">{entityLabel}</span>. Every change is recorded — enter why you're making this edit.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Reason for this edit (required)…"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-amber-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={onClose} className="px-4 py-2 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">Cancel</button>
            <button onClick={confirm} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 rounded-lg text-xs font-bold text-white">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Record &amp; Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
