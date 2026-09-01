import React, { useState, useEffect, useCallback } from "react";
import { X, Plus, Loader2, AlertTriangle, Save, Pencil, MessageSquareWarning } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

interface Props {
  vrn: string;
  jobCardNo?: string | null;
  gateEntryId?: string | null;
  onClose: () => void;
}

const SOURCES = ["DRIVER", "OWNER", "FLEET MAINTENANCE MANAGER / DKM", "OTHER"];
const CATEGORIES = ["Running Repair", "Periodic Maintenance", "Body Repair", "Electrical", "Accidental", "Other"];

const blankForm = () => ({
  source: "DRIVER",
  category: "Running Repair",
  complaint_text: "",
  symptom: "",
  when_occurs: "",
  is_repeat: false,
  is_immobilized: false,
  is_safety_critical: false,
});

/**
 * Add / edit customer & driver complaints for a vehicle. Persists to the real
 * tbl_job_complaints store — available at any stage, not only during intake.
 */
export const ComplaintsManagerModal: React.FC<Props> = ({ vrn, jobCardNo, gateEntryId, onClose }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>(blankForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/complaints?vrn=${encodeURIComponent(vrn)}`, { headers: authHeaders() });
      const data = await res.json();
      setList(Array.isArray(data?.complaints) ? data.complaints : []);
    } catch { setError("Failed to load complaints."); }
    setLoading(false);
  }, [vrn]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (c: any) => {
    setEditingId(c.complaint_id);
    setForm({
      source: c.source || "DRIVER",
      category: c.category || "Running Repair",
      complaint_text: c.complaint_text || "",
      symptom: c.symptom || "",
      when_occurs: c.when_occurs || "",
      is_repeat: !!c.is_repeat,
      is_immobilized: !!c.is_immobilized,
      is_safety_critical: !!c.is_safety_critical,
    });
  };

  const resetForm = () => { setEditingId(null); setForm(blankForm()); };

  const save = async () => {
    if (!form.complaint_text.trim()) { setError("Complaint text is required."); return; }
    setSaving(true); setError(null);
    try {
      const res = editingId
        ? await fetch(`/api/complaints/${encodeURIComponent(editingId)}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(form) })
        : await fetch(`/api/complaints`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ ...form, vrn, job_card_no: jobCardNo || null, gate_entry_id: gateEntryId || null }) });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Failed to save complaint."); setSaving(false); return; }
      resetForm();
      await load();
    } catch { setError("Failed to save complaint."); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
              <MessageSquareWarning className="h-4 w-4 text-orange-400" /> Customer / Driver Complaints
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{vrn}{jobCardNo ? ` · ${jobCardNo}` : ""}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Existing complaints */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Registered ({list.length})</h4>
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm py-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : list.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No complaints registered for this vehicle yet.</p>
            ) : (
              <div className="space-y-2">
                {list.map((c) => (
                  <div key={c.complaint_id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-100">{c.complaint_text}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c.source}</span>
                          {c.category && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c.category}</span>}
                          {!!c.is_safety_critical && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">SAFETY-CRITICAL</span>}
                          {!!c.is_immobilized && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">IMMOBILIZED</span>}
                          {!!c.is_repeat && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">REPEAT</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">by {c.authored_by || "—"}</p>
                      </div>
                      <button onClick={() => startEdit(c)} className="shrink-0 text-slate-400 hover:text-orange-400" title="Edit"><Pencil className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add / edit form */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-orange-400">{editingId ? "Edit complaint" : "Add a complaint"}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source</label>
                <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs">
                  {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs">
                  {CATEGORIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Complaint (as reported)</label>
              <textarea value={form.complaint_text} onChange={(e) => setForm({ ...form, complaint_text: e.target.value })}
                rows={2} placeholder="e.g. Engine noise on acceleration"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.symptom} onChange={(e) => setForm({ ...form, symptom: e.target.value })} placeholder="Symptom (optional)"
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs" />
              <input value={form.when_occurs} onChange={(e) => setForm({ ...form, when_occurs: e.target.value })} placeholder="When it occurs (optional)"
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs" />
            </div>
            <div className="flex flex-wrap gap-4 text-xs">
              {(["is_repeat", "is_immobilized", "is_safety_critical"] as const).map((k) => (
                <label key={k} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                  {k === "is_repeat" ? "Repeat" : k === "is_immobilized" ? "Immobilized" : "Safety-critical"}
                </label>
              ))}
            </div>
            {error && <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> {error}</p>}
            <div className="flex gap-2">
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 rounded-lg text-xs font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {editingId ? "Save changes" : "Add complaint"}
              </button>
              {editingId && <button onClick={resetForm} className="px-4 py-2 border border-slate-700 rounded-lg text-xs font-bold text-slate-300">Cancel</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
