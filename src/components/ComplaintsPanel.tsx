import React, { useState, useEffect, useCallback } from "react";
import { Loader2, MessageSquareWarning } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

interface Props {
  vrn: string;
  /** Optional: collapse to a compact single-line summary until expanded. */
  compact?: boolean;
}

/**
 * Read-only view of the complaints the Service Advisor logged for this
 * vehicle (tbl_job_complaints via GET /api/complaints). Embedded in every
 * downstream workspace (floor supervisor, technician, manager) so complaints
 * stay visible until the job card is marked completed — nothing here can
 * add, edit, or delete a complaint; that stays exclusive to
 * ComplaintsManagerModal at the SA stage.
 */
export const ComplaintsPanel: React.FC<Props> = ({ vrn, compact }) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);

  const load = useCallback(async () => {
    if (!vrn) { setLoading(false); return; }
    setLoading(true);
    try {
      const t = getStaffToken();
      const res = await fetch(`/api/complaints?vrn=${encodeURIComponent(vrn)}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      const data = await res.json();
      setList(Array.isArray(data?.complaints) ? data.complaints : []);
    } catch {
      setList([]);
    }
    setLoading(false);
  }, [vrn]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-xs py-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading complaints…
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <p className="text-[11px] text-slate-500 italic py-1">No complaints logged for this vehicle.</p>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-orange-400">
          <MessageSquareWarning className="h-3.5 w-3.5" /> Complaints ({list.length})
        </span>
        {compact && <span className="text-[10px] text-slate-500">{expanded ? "hide" : "show"}</span>}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {list.map((c) => (
            <div key={c.complaint_id} className="rounded-md border border-slate-800 bg-slate-900 p-2.5">
              <p className="text-xs text-slate-100">{c.complaint_text}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5 text-[9px]">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{c.source}</span>
                {c.category && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{c.category}</span>}
                {!!c.is_safety_critical && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">SAFETY-CRITICAL</span>}
                {!!c.is_immobilized && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">IMMOBILIZED</span>}
                {!!c.is_repeat && <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">REPEAT</span>}
              </div>
              <p className="text-[9px] text-slate-500 mt-1">by {c.authored_by || "—"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
