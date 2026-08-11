import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, Clock, AlertTriangle, TrendingUp, Gift, CalendarCheck, Loader2, RefreshCw,
} from "lucide-react";
import { staffAuthHeaders } from "../lib/authToken";

/**
 * "MY RESPONSIBILITY" — Phase 3: My Workspace.
 * One personal, role-agnostic screen. Everything is self-scoped by the server
 * (/api/my/summary derives from the JWT only — no client id is trusted).
 */

interface Props {
  currentUser?: any;
  onOpenJob?: (job: any) => void;
}

const authHeaders = (): Record<string, string> => staffAuthHeaders();

const inr = (n: any) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const pct = (n: any) => (n == null ? "—" : `${Number(n).toFixed(0)}%`);

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: string }) {
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-black mt-1 tabular-nums">{value}</p>
    </div>
  );
}

export default function MyWorkspace({ currentUser, onOpenJob }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/my/summary", { headers: authHeaders() });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Failed to load."); }
      setData(await r.json());
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const isClosed = (s: string) => ["completed", "invoiced", "cancelled"].includes(String(s || "").toLowerCase());
  const jobs: any[] = data?.jobs || [];
  const pendingJobs = useMemo(() => jobs.filter(j => !isClosed(j.status)), [jobs]);
  const now = Date.now();
  const breachJobs = useMemo(() => pendingJobs.filter(j => {
    const due = j.promised_delivery || j.promised_delivery_date || j.expected_delivery || j.due_date;
    const t = due ? new Date(due).getTime() : NaN;
    return !isNaN(t) && t < now;
  }), [pendingJobs]);

  const perf = data?.performance;
  const counts = data?.counts || {};
  const me = data?.me || {};

  if (loading) {
    return <div className="flex items-center gap-2 text-slate-500 p-8 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading your workspace…</div>;
  }
  if (err) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{err}</p>
        <button onClick={load} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded px-3 py-1.5">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">My Workspace</h1>
          <p className="text-xs text-slate-500">
            {me.full_name || currentUser?.full_name || "Me"}
            {me.role ? ` · ${me.role}` : ""} — only what you own or are responsible for.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-3 py-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={ClipboardList} label="My Jobs" value={counts.total ?? jobs.length} tone="bg-slate-50 border-slate-200 text-slate-700" />
        <StatCard icon={Clock} label="My Pending" value={counts.pending ?? pendingJobs.length} tone="bg-amber-50 border-amber-200 text-amber-700" />
        <StatCard icon={AlertTriangle} label="My Breaches" value={counts.breaches ?? breachJobs.length} tone="bg-red-50 border-red-200 text-red-700" />
        <StatCard icon={CalendarCheck} label="Attendance (mo)" value={counts.attendance_days ?? 0} tone="bg-emerald-50 border-emerald-200 text-emerald-700" />
      </div>

      {/* Performance & Incentives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-indigo-600" /> My Performance
          </h3>
          {perf ? (
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-slate-500 text-xs">Allocated Revenue</span>
              <span className="font-bold text-right">{inr(perf.allocated_revenue)}</span>
              <span className="text-slate-500 text-xs">Paid %</span>
              <span className="font-bold text-right">{pct(perf.paid_percentage)}</span>
              <span className="text-slate-500 text-xs">TML Claim %</span>
              <span className="font-bold text-right">{pct(perf.tml_claim_percentage)}</span>
              {perf.score != null && (<><span className="text-slate-500 text-xs">Score</span><span className="font-bold text-right">{perf.score}</span></>)}
            </div>
          ) : <p className="text-xs text-slate-400 italic">No performance record linked to your account.</p>}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-emerald-600" /> My Incentives
          </h3>
          {perf && perf.incentive != null ? (
            <p className="text-3xl font-black text-emerald-700 tabular-nums">{inr(perf.incentive)}</p>
          ) : <p className="text-xs text-slate-400 italic">Incentive not published for this cycle.</p>}
        </div>
      </div>

      {/* My Jobs list */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">My Job Cards</h3>
          <span className="text-[10px] text-slate-400">{jobs.length} total · {breachJobs.length} breached</span>
        </div>
        <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
          {jobs.length === 0 && <p className="text-xs text-slate-400 italic p-4">No job cards assigned or related to you yet.</p>}
          {jobs.map((j) => {
            const due = j.promised_delivery || j.promised_delivery_date || j.expected_delivery || j.due_date;
            const t = due ? new Date(due).getTime() : NaN;
            const breached = !isNaN(t) && t < now && !isClosed(j.status);
            return (
              <button
                key={j.job_id}
                onClick={() => onOpenJob?.(j)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-orange-600">{j.job_card_no || j.job_card_number || `#${j.job_id}`}</span>
                    <span className="text-xs font-bold text-slate-800 uppercase">{j.vrn}</span>
                    {breached && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 uppercase">Breach</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{j.customer_name} {j.current_workflow_state ? `· ${j.current_workflow_state}` : ""}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${isClosed(j.status) ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                  {j.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
