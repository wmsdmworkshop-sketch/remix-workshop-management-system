import React, { useState, useEffect, useCallback } from "react";
import { GraduationCap, Plus, Loader2 } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export interface TrainingDevelopmentProps {
  employees: any[];
  currentUser?: any;
}

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];

/**
 * Simple internal training tracking (tbl_training_records) — not a full LMS.
 * employees.lms_id (external LMS reference) is untouched by this.
 * Management-only screen (already gated in ROLE_TABS to HR_APPROVER_ROLES).
 */
export const TrainingDevelopment: React.FC<TrainingDevelopmentProps> = ({ employees = [], currentUser }) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ course_name: "", status: "NOT_STARTED", completed_date: "", certificate_ref: "" });

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const selectedEmployee = employees.find((e: any) => e.employee_id === selectedEmployeeId);

  const loadRecords = useCallback(async (empId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/training/${empId}`, { headers: authHeaders() });
      const data = await res.json();
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch { setRecords([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) loadRecords(selectedEmployeeId);
    else setRecords([]);
  }, [selectedEmployeeId, loadRecords]);

  const handleAdd = async () => {
    if (!selectedEmployeeId || !form.course_name.trim()) { alert("Select an employee and enter a course name."); return; }
    try {
      const res = await fetch("/api/training", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ employee_id: selectedEmployeeId, ...form, completed_date: form.completed_date || null }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to add record."); return; }
      setForm({ course_name: "", status: "NOT_STARTED", completed_date: "", certificate_ref: "" });
      setShowAdd(false);
      await loadRecords(selectedEmployeeId);
    } catch (e: any) { alert(`Failed: ${e.message || "network error"}`); }
  };

  const updateStatus = async (recordId: string, status: string) => {
    try {
      await fetch(`/api/training/${recordId}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify({ status }) });
      if (selectedEmployeeId) await loadRecords(selectedEmployeeId);
    } catch { /* best-effort */ }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <GraduationCap className="h-5 w-5 text-emerald-400" />
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Training & Development</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Employee</h3>
          <select
            value={selectedEmployeeId ?? ""}
            onChange={e => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : null)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200"
          >
            <option value="">Select employee…</option>
            {employees.map((e: any) => <option key={e.employee_id} value={e.employee_id}>{e.full_name} ({e.role})</option>)}
          </select>
          {selectedEmployee?.lms_id && (
            <p className="text-[10px] text-slate-500">External LMS ID: <span className="font-mono text-slate-400">{selectedEmployee.lms_id}</span></p>
          )}
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Training Records</h3>
            {selectedEmployeeId && (
              <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase rounded-lg">
                <Plus className="h-3.5 w-3.5" /> {showAdd ? "Cancel" : "Add Record"}
              </button>
            )}
          </div>

          {!selectedEmployeeId ? (
            <p className="text-xs text-slate-500 italic text-center py-10">Select an employee to view their training records.</p>
          ) : (
            <>
              {showAdd && (
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Course name" value={form.course_name} onChange={e => setForm({ ...form, course_name: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 col-span-2" />
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                  <input type="date" value={form.completed_date} onChange={e => setForm({ ...form, completed_date: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200" />
                  <input type="text" placeholder="Certificate ref (optional)" value={form.certificate_ref} onChange={e => setForm({ ...form, certificate_ref: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 col-span-2" />
                  <button onClick={handleAdd} className="col-span-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-lg">Save</button>
                </div>
              )}
              {loading ? <p className="text-xs text-slate-400 text-center py-6">Loading…</p> : records.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-6">No training records yet.</p>
              ) : records.map((r: any) => (
                <div key={r.record_id} className="flex items-center justify-between p-3 rounded-lg border border-slate-850 bg-slate-950/40 text-xs">
                  <div>
                    <span className="font-bold text-slate-200">{r.course_name}</span>
                    {r.certificate_ref && <span className="text-slate-500 ml-2">· {r.certificate_ref}</span>}
                    {r.completed_date && <span className="text-slate-500 ml-2">· {r.completed_date}</span>}
                  </div>
                  <select value={r.status} onChange={e => updateStatus(r.record_id, e.target.value)} className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold uppercase text-slate-300">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingDevelopment;
