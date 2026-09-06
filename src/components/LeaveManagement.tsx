import React, { useState, useEffect, useCallback } from "react";
import { ClipboardCheck, Send, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export interface LeaveManagementProps {
  currentUser?: any;
}

const HR_APPROVER_ROLES = ["admin", "developer", "workshop_manager", "service_manager", "general_manager", "gm_service"];
const LEAVE_TYPES = ["Casual", "Sick", "Earned", "Unpaid", "Other"];

/**
 * Real request -> approve/reject workflow (tbl_leave_requests), modeled
 * directly on OvertimeEmployeeDashboard's existing state machine — every
 * employee can request leave; HR/management roles see a pending-approval
 * queue. No fabricated balances/accrual — this tracks requests only.
 */
export const LeaveManagement: React.FC<LeaveManagementProps> = ({ currentUser }) => {
  const isApprover = HR_APPROVER_ROLES.includes(String(currentUser?.role || ""));
  const [view, setView] = useState<"mine" | "pending">("mine");
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leave_type: "Casual", start_date: "", end_date: "", reason: "" });

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const loadMine = useCallback(async () => {
    try {
      const res = await fetch("/api/leave/mine", { headers: authHeaders() });
      const data = await res.json();
      setMyRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch { setMyRequests([]); }
  }, []);

  const loadPending = useCallback(async () => {
    if (!isApprover) return;
    try {
      const res = await fetch("/api/leave/pending", { headers: authHeaders() });
      const data = await res.json();
      setPending(Array.isArray(data?.requests) ? data.requests : []);
    } catch { setPending([]); }
  }, [isApprover]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMine(), loadPending()]).finally(() => setLoading(false));
  }, [loadMine, loadPending]);

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) { alert("Start and end date are required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave/request", { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to submit leave request."); setSubmitting(false); return; }
      setForm({ leave_type: "Casual", start_date: "", end_date: "", reason: "" });
      await loadMine();
    } catch (e: any) { alert(`Failed to submit: ${e.message || "network error"}`); }
    setSubmitting(false);
  };

  const decide = async (id: string, decision: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/leave/${id}/decide`, { method: "POST", headers: authHeaders(), body: JSON.stringify({ decision }) });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to record decision."); return; }
      await loadPending();
    } catch (e: any) { alert(`Failed: ${e.message || "network error"}`); }
  };

  const statusBadge = (status: string) => {
    const cls = status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400" : status === "REJECTED" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400";
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>{status}</span>;
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <ClipboardCheck className="h-5 w-5 text-emerald-400" />
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Leave Management</h1>
      </div>

      {isApprover && (
        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
          <button onClick={() => setView("mine")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${view === "mine" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>My Requests</button>
          <button onClick={() => setView("pending")} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${view === "pending" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>Pending Approvals ({pending.length})</button>
        </div>
      )}

      {view === "mine" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Request Leave</h3>
            <select value={form.leave_type} onChange={e => setForm({ ...form, leave_type: e.target.value })} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200">
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200" />
              <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200" />
            </div>
            <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason (optional)" rows={2} className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200" />
            <button onClick={handleSubmit} disabled={submitting} className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-xs uppercase rounded-lg">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Submit
            </button>
          </div>
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">My Requests</h3>
            {loading ? <p className="text-xs text-slate-400 text-center py-6">Loading…</p> : myRequests.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No leave requests yet.</p>
            ) : myRequests.map((r: any) => (
              <div key={r.leave_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-xs">
                <div>
                  <span className="font-bold text-slate-200">{r.leave_type}</span>
                  <span className="text-slate-400 ml-2">{r.start_date} → {r.end_date}</span>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "pending" && isApprover && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Approvals</h3>
          {pending.length === 0 ? <p className="text-xs text-slate-500 italic text-center py-6">Nothing pending.</p> : pending.map((r: any) => (
            <div key={r.leave_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-xs">
              <div>
                <span className="font-bold text-slate-200">{r.employee_name || `Employee #${r.employee_id}`}</span>
                <span className="text-slate-400 ml-2">{r.leave_type} · {r.start_date} → {r.end_date}</span>
                {r.reason && <p className="text-slate-500 mt-1">{r.reason}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => decide(r.leave_id, "APPROVED")} className="p-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400"><CheckCircle2 className="h-4 w-4" /></button>
                <button onClick={() => decide(r.leave_id, "REJECTED")} className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400"><XCircle className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
