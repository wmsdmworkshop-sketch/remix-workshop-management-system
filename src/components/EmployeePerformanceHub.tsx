import React, { useState, useMemo } from "react";
import { TrendingUp, Search } from "lucide-react";
import { isWorkCompleteStatus } from "../types";

export interface EmployeePerformanceHubProps {
  employees: any[];
  jobCards: any[];
}

/**
 * Aggregation-only — composes already-real numbers (job-card outcomes,
 * employee_grade/certification_level, allocated/target revenue) into one
 * HR-facing summary. No new table: this business has no subjective
 * manager-review process to digitize yet, so inventing a ratings schema
 * would just be a fabricated data field with nothing real behind it.
 */
export const EmployeePerformanceHub: React.FC<EmployeePerformanceHubProps> = ({ employees = [], jobCards = [] }) => {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    return employees
      .filter((e: any) => e.is_active !== false)
      .map((e: any) => {
        // Case-insensitive and trimmed on BOTH sides. Production stores names
        // with trailing spaces and mixed casing — the advisor exists literally
        // as 'ranjeet ' in employees, users and user_access_master — and the
        // previous exact compare silently attributed zero jobs to real people.
        const name = String(e.full_name || "").trim().toLowerCase();
        const matched = jobCards.filter((j: any) => {
          const tech = String(j.technician_name || "").trim().toLowerCase();
          const sa = String(j.service_advisor || "").trim().toLowerCase();
          return (name !== "" && tech !== "" && tech.includes(name)) || (name !== "" && sa === name);
        });
        // isWorkCompleteStatus, NOT a literal comparison. job_status is an ENUM
        // of Open / In Progress / Waiting Parts / Ready / Delivered / Carry
        // Forward / Assigned / Unassigned / In Queue — "Completed" is not one of
        // them, so `status === "completed"` matched nothing and this column read
        // 0 for every employee, forever. See the helpers in src/types.ts.
        const completed = matched.filter((j: any) => isWorkCompleteStatus(j.status)).length;
        const reworked = matched.filter((j: any) => (j.rework_count || 0) > 0).length;
        const total = matched.length;
        const ftr = total > 0 ? Math.round(((total - reworked) / total) * 100) : null;
        return {
          employee_id: e.employee_id,
          full_name: e.full_name,
          role: e.role,
          grade: e.employee_grade || "Junior",
          certification: e.certification_level || "Not Certified",
          jobsHandled: total,
          completed,
          ftr,
          allocatedRevenue: e.allocated_revenue,
          targetRevenue: e.target_revenue,
        };
      })
      .filter((r) => !search.trim() || r.full_name.toLowerCase().includes(search.toLowerCase()) || String(r.role || "").toLowerCase().includes(search.toLowerCase()));
  }, [employees, jobCards, search]);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Employee Performance</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee or role…"
            className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 outline-none w-64"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase text-[10px] font-bold border-b border-slate-800">
              <th className="text-left p-3">Employee</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Grade</th>
              <th className="text-left p-3">Certification</th>
              <th className="text-right p-3">Jobs Handled</th>
              <th className="text-right p-3">Completed</th>
              <th className="text-right p-3">FTR</th>
              <th className="text-right p-3">Revenue (Allocated / Target)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-500 italic py-8">No employees match.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.employee_id} className="border-b border-slate-850 last:border-0 hover:bg-slate-950/40">
                <td className="p-3 font-bold text-slate-200">{r.full_name}</td>
                <td className="p-3 text-slate-400">{r.role}</td>
                <td className="p-3">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${r.grade === "Senior" ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-800 text-slate-400"}`}>{r.grade}</span>
                </td>
                <td className="p-3 text-slate-400">{r.certification}</td>
                <td className="p-3 text-right font-mono text-slate-200">{r.jobsHandled}</td>
                <td className="p-3 text-right font-mono text-slate-200">{r.completed}</td>
                <td className="p-3 text-right font-mono">
                  {r.ftr === null ? <span className="text-slate-500">—</span> : <span className={r.ftr >= 90 ? "text-emerald-400" : r.ftr >= 75 ? "text-amber-400" : "text-red-400"}>{r.ftr}%</span>}
                </td>
                <td className="p-3 text-right font-mono text-slate-400">
                  {r.allocatedRevenue != null || r.targetRevenue != null
                    ? `₹${Number(r.allocatedRevenue || 0).toLocaleString("en-IN")} / ₹${Number(r.targetRevenue || 0).toLocaleString("en-IN")}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeePerformanceHub;
