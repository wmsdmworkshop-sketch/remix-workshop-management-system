import { useEffect, useState, useCallback } from "react";
import { MessageSquarePlus, Send, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

/**
 * "MY RESPONSIBILITY" — Update Request panel.
 * The core job-card details are locked to the owning Service Advisor. Anyone else who
 * needs a change / spots a mistake raises an Update Request here; the owning advisor
 * or a manager actions it. Server enforces who may resolve — this UI is best-effort.
 */

interface UpdateRequest {
  id: number;
  job_card_id: number;
  requested_by_name?: string | null;
  requested_by_role?: string | null;
  message: string;
  status: string; // open | approved | rejected | applied
  resolution_note?: string | null;
  resolved_by_name?: string | null;
  created_at?: string;
  resolved_at?: string | null;
}

interface Props {
  jobId: number;
  jobCard?: any;
  currentUser?: any;
  currentUserRole?: string;
}

const authHeaders = (): Record<string, string> => {
  const token = getStaffToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
};

const statusBadge = (s: string) => {
  switch (s) {
    case "approved": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "applied": return "bg-blue-50 text-blue-700 border-blue-200";
    case "rejected": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

export default function UpdateRequestPanel({ jobId, jobCard, currentUser, currentUserRole }: Props) {
  const [requests, setRequests] = useState<UpdateRequest[]>([]);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Best-effort client gate for the resolve buttons (server is authoritative).
  const role = String(currentUserRole || currentUser?.role || "").toLowerCase();
  const isManager = /admin|developer|principal|gm|manager/.test(role);
  const myName = String(currentUser?.full_name || currentUser?.displayName || "").toLowerCase();
  const isOwner =
    (currentUser?.user_id != null && Number(jobCard?.created_by) === Number(currentUser.user_id)) ||
    (!!jobCard?.service_advisor && myName.length > 0 &&
      String(jobCard.service_advisor).toLowerCase().includes(myName));
  const canResolve = isManager || isOwner;

  const load = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/job-cards/${jobId}/update-requests`, { headers: authHeaders() });
      if (r.ok) setRequests(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    const msg = message.trim();
    if (!msg) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/job-cards/${jobId}/update-request`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ message: msg }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Failed to raise request."); }
      setMessage(""); setOpen(false);
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const resolve = async (reqId: number, status: string) => {
    setBusy(true); setErr(null);
    try {
      const note = status === "rejected" ? (window.prompt("Reason (optional):") || "") : "";
      const r = await fetch(`/api/update-requests/${reqId}/resolve`, {
        method: "POST", headers: authHeaders(), body: JSON.stringify({ status, note }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Failed to resolve."); }
      await load();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };

  const openCount = requests.filter(r => r.status === "open").length;

  return (
    <div className="border border-slate-200 rounded-lg bg-white/60 p-3 mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4 text-indigo-600" />
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            Update Requests{openCount > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 border border-amber-200 text-[9px] px-1.5 py-0.5 rounded-full">
                {openCount} open
              </span>
            )}
          </h4>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 rounded px-2.5 py-1 uppercase tracking-wider cursor-pointer"
        >
          {open ? "Cancel" : "Raise Request"}
        </button>
      </div>

      <p className="text-[10px] text-slate-500 mt-1">
        Core job-card details are locked to the Service Advisor. Need a change or spotted a mistake? Raise a request describing it.
      </p>

      {open && (
        <div className="mt-2 space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Describe exactly what needs to change on this job card…"
            className="w-full text-[11px] border border-slate-200 rounded px-2 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-indigo-300"
          />
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={busy || !message.trim()}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider cursor-pointer"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              Submit
            </button>
          </div>
        </div>
      )}

      {err && <p className="text-[10px] text-red-600 mt-1">{err}</p>}

      <div className="mt-2 space-y-1.5">
        {loading && <p className="text-[10px] text-slate-400">Loading…</p>}
        {!loading && requests.length === 0 && (
          <p className="text-[10px] text-slate-400 italic">No update requests yet.</p>
        )}
        {requests.map((r) => (
          <div key={r.id} className="border border-slate-100 rounded p-2 bg-slate-50/50">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-slate-800 break-words">{r.message}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  {r.requested_by_name || "Unknown"}
                  {r.requested_by_role ? ` · ${r.requested_by_role}` : ""}
                  {r.created_at ? ` · ${new Date(r.created_at).toLocaleString()}` : ""}
                </p>
                {r.resolution_note && (
                  <p className="text-[9px] text-slate-500 mt-0.5 italic">Note: {r.resolution_note}</p>
                )}
              </div>
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${statusBadge(r.status)}`}>
                {r.status}
              </span>
            </div>
            {canResolve && r.status === "open" && (
              <div className="flex gap-1.5 mt-2">
                <button onClick={() => resolve(r.id, "applied")} disabled={busy}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2 py-0.5 uppercase cursor-pointer disabled:opacity-50">
                  <CheckCircle2 className="h-3 w-3" /> Applied
                </button>
                <button onClick={() => resolve(r.id, "approved")} disabled={busy}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded px-2 py-0.5 uppercase cursor-pointer disabled:opacity-50">
                  <Clock className="h-3 w-3" /> Approve
                </button>
                <button onClick={() => resolve(r.id, "rejected")} disabled={busy}
                  className="inline-flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded px-2 py-0.5 uppercase cursor-pointer disabled:opacity-50">
                  <XCircle className="h-3 w-3" /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
