import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Plus, Trash2, Loader2 } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export interface HolidaysManagementProps {
  currentUser?: any;
}

const HR_APPROVER_ROLES = ["admin", "developer", "workshop_manager", "service_manager", "general_manager", "gm_service"];

/**
 * Company holiday calendar (tbl_holidays). Read-only for everyone; add/
 * delete restricted to HR/management roles, enforced server-side too.
 */
export const HolidaysManagement: React.FC<HolidaysManagementProps> = ({ currentUser }) => {
  const canManage = HR_APPROVER_ROLES.includes(String(currentUser?.role || ""));
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ holiday_date: "", name: "", is_optional: false });

  const authHeaders = (): Record<string, string> => {
    const t = getStaffToken();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/holidays", { headers: authHeaders() });
      const data = await res.json();
      setHolidays(Array.isArray(data?.holidays) ? data.holidays : []);
    } catch { setHolidays([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.holiday_date || !form.name.trim()) { alert("Date and name are required."); return; }
    try {
      const res = await fetch("/api/holidays", { method: "POST", headers: authHeaders(), body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok || !data.success) { alert(data?.error || "Failed to add holiday."); return; }
      setForm({ holiday_date: "", name: "", is_optional: false });
      setShowAdd(false);
      await load();
    } catch (e: any) { alert(`Failed: ${e.message || "network error"}`); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this holiday?")) return;
    try {
      await fetch(`/api/holidays/${id}`, { method: "DELETE", headers: authHeaders() });
      await load();
    } catch { /* best-effort */ }
  };

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h: any) => h.holiday_date >= today);
  const past = holidays.filter((h: any) => h.holiday_date < today);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Holidays</h1>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-lg">
            <Plus className="h-3.5 w-3.5" /> {showAdd ? "Cancel" : "Add Holiday"}
          </button>
        )}
      </div>

      {showAdd && canManage && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <input type="date" value={form.holiday_date} onChange={e => setForm({ ...form, holiday_date: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200" />
          <input type="text" placeholder="Holiday name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-850 rounded-lg p-2 text-xs text-slate-200 md:col-span-2" />
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={form.is_optional} onChange={e => setForm({ ...form, is_optional: e.target.checked })} /> Optional
          </label>
          <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase rounded-lg md:col-span-4">Save</button>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-slate-400 text-center py-10">Loading…</p>
      ) : holidays.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-10">No holidays configured yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-2">Upcoming</h3>
            {upcoming.length === 0 ? <p className="text-xs text-slate-500 italic">None upcoming.</p> : upcoming.map((h: any) => (
              <div key={h.holiday_id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-850 bg-slate-950/40 text-xs">
                <div><span className="font-mono font-bold text-emerald-400">{h.holiday_date}</span><span className="text-slate-200 ml-2">{h.name}</span>{!!h.is_optional && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase font-bold">Optional</span>}</div>
                {canManage && <button onClick={() => handleDelete(h.holiday_id)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Past</h3>
            {past.length === 0 ? <p className="text-xs text-slate-500 italic">None.</p> : past.map((h: any) => (
              <div key={h.holiday_id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-850 bg-slate-950/20 text-xs text-slate-500">
                <div><span className="font-mono">{h.holiday_date}</span><span className="ml-2">{h.name}</span></div>
                {canManage && <button onClick={() => handleDelete(h.holiday_id)} className="hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidaysManagement;
