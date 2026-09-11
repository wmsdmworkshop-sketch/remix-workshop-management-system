import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Filter, Download, ChevronDown, ChevronRight,
  Clock, User, Shield, Activity, AlertTriangle, RefreshCw
} from "lucide-react";

interface AuditRow {
  id: number;
  job_card_id: number;
  job_card_no: string;
  action_type: string;
  action_detail: string | null;
  old_snapshot: any;
  new_snapshot: any;
  actor_user_id: number | null;
  actor_name: string | null;
  actor_role: string | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  JC_CREATED:           "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  JC_STATUS_CHANGED:    "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  JC_UPDATED:           "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  JC_DELETED:           "bg-red-500/20 text-red-300 border border-red-500/30",
  TECH_ASSIGNED:        "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  BILLED:               "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  REPAIR_STARTED:       "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  ESTIMATE_APPROVED:    "bg-teal-500/20 text-teal-300 border border-teal-500/30",
  QC_CHECK:             "bg-purple-500/20 text-purple-300 border border-purple-500/30",
  PRE_INVOICE:          "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
  MANAGER_APPROVED:     "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
  UPDATE_REQUEST_RAISED:"bg-rose-500/20 text-rose-300 border border-rose-500/30",
};

function SnapshotDiff({ oldSnap, newSnap }: { oldSnap: any; newSnap: any }) {
  if (!oldSnap && !newSnap) return <p className="text-xs text-white/40 italic">No snapshot data</p>;
  const allKeys = Array.from(new Set([
    ...Object.keys(oldSnap || {}),
    ...Object.keys(newSnap || {}),
  ]));
  return (
    <div className="mt-2 space-y-1">
      {allKeys.map(k => {
        const oldVal = JSON.stringify((oldSnap || {})[k] ?? undefined);
        const newVal = JSON.stringify((newSnap || {})[k] ?? undefined);
        const changed = oldVal !== newVal;
        return (
          <div key={k} className={`flex gap-2 text-xs rounded px-2 py-1 font-mono ${changed ? "bg-white/5" : "opacity-50"}`}>
            <span className="text-white/40 w-32 shrink-0 truncate">{k}</span>
            {oldSnap && oldVal !== undefined && (
              <span className="text-red-400 line-through truncate max-w-[180px]">{oldVal}</span>
            )}
            {newSnap && newVal !== undefined && (
              <span className="text-emerald-400 truncate max-w-[180px]">{newVal}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const AuditRowCard: React.FC<{ row: AuditRow }> = ({ row }) => {
  const [expanded, setExpanded] = useState(false);
  const colorClass = ACTION_COLORS[row.action_type] || "bg-white/10 text-white/60 border border-white/10";
  const oldSnap = typeof row.old_snapshot === "string" ? JSON.parse(row.old_snapshot) : row.old_snapshot;
  const newSnap = typeof row.new_snapshot === "string" ? JSON.parse(row.new_snapshot) : row.new_snapshot;
  const hasSnapshot = !!(oldSnap || newSnap);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div
        className={`flex items-start gap-3 px-4 py-3 ${hasSnapshot ? "cursor-pointer" : ""}`}
        onClick={() => hasSnapshot && setExpanded(e => !e)}
      >
        <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${colorClass}`}>
          {row.action_type.replace(/_/g, " ")}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm">{row.job_card_no}</span>
            {row.action_detail && (
              <span className="text-white/60 text-xs truncate">{row.action_detail}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/40 flex-wrap">
            {row.actor_name && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {row.actor_name}
                {row.actor_role && <span className="opacity-60">({row.actor_role})</span>}
              </span>
            )}
            {row.ip_address && (
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />{row.ip_address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(row.created_at).toLocaleString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit"
              })}
            </span>
          </div>
        </div>
        {hasSnapshot && (
          <div className="shrink-0 text-white/30 mt-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        )}
      </div>
      {expanded && hasSnapshot && (
        <div className="border-t border-white/10 px-4 py-3 bg-black/20">
          <p className="text-xs text-white/40 font-medium mb-2 uppercase tracking-wider">Field Changes</p>
          <SnapshotDiff oldSnap={oldSnap} newSnap={newSnap} />
        </div>
      )}
    </div>
  );
}

export default function JcAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jcNo, setJcNo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actionType, setActionType] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchLogs = useCallback(async (customOffset = 0) => {
    setLoading(true); setError(null);
    try {
      const stored = localStorage.getItem("wms_user");
      const token = stored ? JSON.parse(stored).token : null;
      const params = new URLSearchParams();
      if (jcNo)       params.set("jc_no", jcNo);
      if (from)       params.set("from", from);
      if (to)         params.set("to", to);
      if (actionType) params.set("action_type", actionType);
      params.set("limit", String(limit));
      params.set("offset", String(customOffset));
      const res = await fetch(`/api/admin/jc-audit-log?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      const data = await res.json();
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setActionTypes(data.action_types || []);
      setOffset(customOffset);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [jcNo, from, to, actionType]);

  useEffect(() => { fetchLogs(0); }, []);

  const exportCsv = () => {
    const hdr = ["ID","JC No","Action","Detail","Actor","Role","IP","Timestamp"];
    const csvRows = [hdr.join(","), ...rows.map(r =>
      [r.id, r.job_card_no, r.action_type,
       `"${(r.action_detail||"").replace(/"/g,'""')}"`,
       r.actor_name||"", r.actor_role||"", r.ip_address||"", r.created_at].join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csvRows.join("\n")], { type: "text/csv" }));
    a.download = `jc-audit-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-violet-400" /> JC Activity Audit Log
          </h1>
          <p className="text-sm text-white/40 mt-0.5">Complete audit trail · 90-day retention · Admin / Developer only</p>
        </div>
        <div className="flex gap-2">
          <button id="jc-audit-refresh-btn" onClick={() => fetchLogs(offset)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${loading?"animate-spin":""}`}/> Refresh
          </button>
          <button id="jc-audit-export-btn" onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm transition-colors">
            <Download className="h-3.5 w-3.5"/> Export CSV
          </button>
        </div>
      </div>

      <form onSubmit={e=>{e.preventDefault();fetchLogs(0);}}
        className="bg-white/[0.04] border border-white/10 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-white/50 mb-1 font-medium">JC Number</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30"/>
            <input id="jc-audit-search-input" type="text" placeholder="e.g. JC-0045" value={jcNo}
              onChange={e=>setJcNo(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500"/>
          </div>
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs text-white/50 mb-1 font-medium">Action Type</label>
          <select id="jc-audit-action-filter" value={actionType} onChange={e=>setActionType(e.target.value)}
            className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500">
            <option value="">All actions</option>
            {actionTypes.map(t=><option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1 font-medium">From</label>
          <input id="jc-audit-from-date" type="date" value={from} onChange={e=>setFrom(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"/>
        </div>
        <div>
          <label className="block text-xs text-white/50 mb-1 font-medium">To</label>
          <input id="jc-audit-to-date" type="date" value={to} onChange={e=>setTo(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"/>
        </div>
        <button type="submit" id="jc-audit-search-btn"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">
          <Filter className="h-3.5 w-3.5"/> Search
        </button>
      </form>

      {!loading && !error && (
        <p className="text-xs text-white/40">
          {total===0 ? "No records found" : `Showing ${offset+1}–${Math.min(offset+rows.length,total)} of ${total} entries`}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0"/>{error}
        </div>
      )}

      {loading && (
        <div className="space-y-2">{[...Array(5)].map((_,i)=>(
          <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse"/>
        ))}</div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {rows.length===0 ? (
            <div className="text-center py-16 text-white/30">
              <Activity className="h-10 w-10 mx-auto mb-3 opacity-30"/>
              <p className="text-sm">No activity logs found.</p>
              {jcNo && <p className="text-xs mt-1">Try a different JC number or clear the filters.</p>}
            </div>
          ) : rows.map((row: AuditRow)=><AuditRowCard key={row.id} row={row}/>)}
        </div>
      )}

      {!loading && total>limit && (
        <div className="flex justify-center gap-3 pt-2">
          <button id="jc-audit-prev-btn" onClick={()=>fetchLogs(Math.max(0,offset-limit))} disabled={offset===0}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ? Previous
          </button>
          <button id="jc-audit-next-btn" onClick={()=>fetchLogs(offset+limit)} disabled={offset+limit>=total}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next ?
          </button>
        </div>
      )}
    </div>
  );
}
