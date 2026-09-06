import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Send, Loader2 } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export interface GrievanceManagementProps {
  currentUser?: any;
}

const CATEGORIES = ["Workplace Conduct", "Compensation", "Working Conditions", "Harassment", "Other"];
const STATUS_OPTIONS = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];

/**
 * Sensitive: filer sees only their own grievances (JWT-scoped server-side,
 * "no client id trusted" — same pattern as /api/my/*). The "all grievances"
 * review queue is admin/developer only, deliberately not general managers.
 */
export const GrievanceManagement: React.FC<GrievanceManagementProps> = ({ currentUser }) => {
  const isAdmin = ["admin", "developer"].includes(String(currentUser?.role || ""));
  const [view, setView] = useState<"mine" | "all">("mine");
  const [mine, setMine] = useState<any[]>([]);
  const [all, setAll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ category: CATEGORIES[0], description: "" });

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/grievances/mine", { headers: authHeaders() });
      const data = await res.json();
      setMine(Array.isArray(data?.grievances) ? data.grievances : []);
    } catch { setMine([]); }
  }, []);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/grievances/all", { headers: authHeaders() });
      const data = await res.json();
      setAll(Array.isArray(data?.grievances) ? data.grievances : []);
    } catch { setAll([]); }
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMine(), loadAll()]).finally(() => setLoading(false));
  }, [loadMine, loadAll]);

  const handleSubmit = async () => {
    if (!form.description.trim()) { alert("Description is required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/grievances", { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to file grievance."); setSubmitting(false); return; }
      setForm({ category: CATEGORIES[0], description: "" });
      await loadMine();
    } catch (e: any) { alert(`Failed: ${e.message || "network error"}`); }
    setSubmitting(false);
  };

  const updateGrievance = async (id: string, status: string) => {
    const resolution_notes = status === "RESOLVED" || status === "CLOSED" ? (prompt("Resolution notes (optional):") || "") : undefined;
    try {
      await fetch(`/api/grievances/${id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status, resolution_notes }) });
      await loadAll();
    } catch { /* best-effort */ }
  };

  const statusBadge = (status: string) => {
    const cls = status === "RESOLVED" || status === "CLOSED" ? "bg-emerald-500/20 text-emerald-400" : status === "IN_REVIEW" ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400";
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>{status.replace("_", " ")}</span>;
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <ShieldAlert className="h-5 w-5 text-emerald-400" />
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Grievance Management</h1>
      </div>
      <p className="text-[11px] text-slate-500 -mt-4">Grievances you file are visible only to you and HR/admin — not to your manager.</p>

      {isAdmin && (
        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
          <button onClick={() => setView("mine")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${view === "mine" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>My Grievances</button>
          <button onClick={() => setView("all")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${view === "all" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>All Grievances ({all.length})</button>
        </div>
      )}

      {view === "mine" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">File a Grievance</h3>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue…" rows={4} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200" />
            <button onClick={handleSubmit} disabled={submitting} className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs uppercase rounded-lg">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit
            </button>
          </div>
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">My Grievances</h3>
            {loading ? <p className="text-xs text-slate-400 text-center py-6">Loading…</p> : mine.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">You haven't filed any grievances.</p>
            ) : mine.map((g: any) => (
              <div key={g.grievance_id} className="p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">{g.category}</span>
                  {statusBadge(g.status)}
                </div>
                <p className="text-slate-400">{g.description}</p>
                {g.resolution_notes && <p className="text-emerald-400/80 italic">Resolution: {g.resolution_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "all" && isAdmin && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">All Grievances</h3>
          {all.length === 0 ? <p className="text-xs text-slate-500 italic text-center py-6">None filed.</p> : all.map((g: any) => (
            <div key={g.grievance_id} className="p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-200">{g.employee_name || `Employee #${g.employee_id}`}</span>
                  <span className="text-slate-500 ml-2">{g.category}</span>
                </div>
                <select value={g.status} onChange={e => updateGrievance(g.grievance_id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              <p className="text-slate-400">{g.description}</p>
              {g.resolution_notes && <p className="text-emerald-400/80 italic">Resolution: {g.resolution_notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrievanceManagement;
