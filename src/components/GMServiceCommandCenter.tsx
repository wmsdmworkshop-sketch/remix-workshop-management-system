import React, { useState, useMemo } from "react";
import { getStaffToken } from "../lib/authToken";
import { 
  Building2, Sparkles, BarChart3, AlertOctagon, RefreshCw, 
  Clock, DollarSign, Activity, FileText, CheckCircle2 
} from "lucide-react";
import { AICopilotPanel } from "./AICopilotPanel";

export interface GMServiceCommandCenterProps {
  jobCards: any[];
  onRefresh: () => void;
  aiModeEnabled?: boolean;
  currentUser?: any;
}

export const GMServiceCommandCenter: React.FC<GMServiceCommandCenterProps> = React.memo(({
  jobCards = [],
  onRefresh,
  aiModeEnabled = true,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<string>("kpis");

  // Calculations for KPIs
  const computedMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];

    // Filter job cards for today or active ones
    const todayCards = jobCards.filter(j => {
      const cardDate = j.date_in || (j.created_at ? j.created_at.split("T")[0] : "");
      return cardDate === todayStr;
    });

    // Sum revenue across today's cards (or all active if no specific today cards)
    const targetCards = todayCards.length > 0 ? todayCards : jobCards;
    const totalRev = targetCards.reduce((sum, j) => {
      const labor = Number(j.labor_price || j.labour_amount || 0);
      const parts = Number(j.parts_price || j.parts_amount || 0);
      const total = Number(j.total_amount || 0);
      return sum + (labor + parts || total);
    }, 0);

    const count = jobCards.length;
    const completed = jobCards.filter(j => j.status === "Completed" || j.status === "Closed" || j.status === "Billed").length;
    const active = jobCards.filter(j => j.status === "Active" || j.status === "In Progress" || j.status === "Pending").length;
    const reworkCount = jobCards.filter(j => (j.rework_count && j.rework_count > 0) || j.is_rework).length;
    const slaWarningsCount = jobCards.filter(j => j.sla_status === "Breached" || j.sla_status === "Warning" || (j.delay_minutes && j.delay_minutes > 0)).length;

    return { totalRev, count, completed, active, reworkCount, slaWarningsCount };
  }, [jobCards]);

  const formattedRevenue = useMemo(() => {
    if (computedMetrics.totalRev === 0) return "₹0";
    if (computedMetrics.totalRev >= 100000) {
      return `₹${(computedMetrics.totalRev / 100000).toFixed(2)} Lakh`;
    }
    if (computedMetrics.totalRev >= 1000) {
      return `₹${(computedMetrics.totalRev / 1000).toFixed(1)}k`;
    }
    return `₹${computedMetrics.totalRev.toLocaleString("en-IN")}`;
  }, [computedMetrics.totalRev]);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
              GM Service Control
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            GM Service Command Center
          </h1>
        </div>

        {/* Tab triggers */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          {[
            { id: "kpis", label: "Executive KPIs" },
            { id: "brief", label: "AI Daily Brief" },
            { id: "comparison", label: "Workshop Comparison" },
            { id: "credit_approvals", label: "Credit Approvals" },
            { id: "gate_reentry", label: "Gate Re-Entry" },
            { id: "ai_mode", label: "AI Mode" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "kpis" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Today's Gross Revenue", val: formattedRevenue, color: "text-emerald-400" },
            { label: "Total Open Job Cards", val: computedMetrics.active, color: "text-white" },
            { label: "Rework Incidents", val: computedMetrics.reworkCount, color: "text-red-400" },
            { label: "SLA Warnings", val: computedMetrics.slaWarningsCount, color: computedMetrics.slaWarningsCount > 0 ? "text-amber-400 font-bold" : "text-slate-400" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{stat.label}</span>
              <span className={`text-lg font-black ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === "brief" && (
        <AICopilotPanel 
          role="GM Service"
          context={{
            grossRevenue: computedMetrics.totalRev,
            openJobs: computedMetrics.active,
            reworkIncidents: computedMetrics.reworkCount
          }}
        />
      )}

      {activeTab === "comparison" && (
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Building2 className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Workshop Location Comparison</h3>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { name: "Devanand Automobiles Main Workshop", revenue: `₹${computedMetrics.totalRev.toLocaleString('en-IN')}`, CSI: "9.8/10" }
            ].map((loc, idx) => (
              <div key={idx} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
                <span className="font-bold text-slate-200">{loc.name}</span>
                <div className="flex gap-4">
                  <span className="text-slate-400">Rev: {loc.revenue}</span>
                  <span className="text-emerald-400 font-bold">CSI: {loc.CSI}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "credit_approvals" && (
        <GMCreditApprovals currentUser={currentUser} />
      )}

      {activeTab === "gate_reentry" && (
        <GMGateReentryApprovals currentUser={currentUser} onRefresh={onRefresh} />
      )}

      {activeTab === "ai_mode" && (
        <GMAiModeApprovals currentUser={currentUser} />
      )}
    </div>
  );
});

// Extracted component for Credit Approvals
const GMCreditApprovals: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [pendingCredits, setPendingCredits] = useState<any[]>([]);

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/gate-out/gm-pending-credits", {
        headers: { Authorization: `Bearer ${getStaffToken()}` }
      });
      if (res.ok) setPendingCredits(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchCredits();
    const interval = setInterval(fetchCredits, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleDecision = async (creditRequestId: string, decision: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/gate-out/decide-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStaffToken()}` },
        body: JSON.stringify({ creditRequestId, decision })
      });
      if (res.ok) {
        fetchCredits();
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
        <DollarSign className="h-4 w-4 text-orange-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Credit Approvals</h3>
      </div>
      {pendingCredits.length === 0 && <p className="text-xs text-slate-500">No pending credit requests.</p>}
      <div className="space-y-4">
        {pendingCredits.map(c => (
          <div key={c.credit_request_id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-sm font-bold text-orange-400">{c.vrn}</div>
                <div className="text-[10px] text-slate-400 mt-1">Requested by: {c.requested_by}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-400">₹{c.amount}</div>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-slate-300 mb-4">
              Reason: {c.reason}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDecision(c.credit_request_id, "APPROVE")}
                className="ds-button-success py-3 text-xs font-bold uppercase rounded-xl border border-emerald-600/30"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(c.credit_request_id, "REJECT")}
                className="py-3 bg-red-600/20 text-red-400 text-xs font-bold uppercase rounded-xl border border-red-600/30"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Same-day gate re-entry requires GM approval: a vehicle whose job card was
// closed earlier the same calendar day cannot be gated in again without a
// human check here — see the same-day reopen guard on POST /api/job-cards.
const GMGateReentryApprovals: React.FC<{ currentUser?: any; onRefresh: () => void }> = ({ currentUser, onRefresh }) => {
  const [pendingReentries, setPendingReentries] = useState<any[]>([]);

  const fetchReentries = async () => {
    try {
      const res = await fetch("/api/gate-reentry-requests?status=PENDING", {
        headers: { Authorization: `Bearer ${getStaffToken()}` }
      });
      if (res.ok) setPendingReentries(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchReentries();
    const interval = setInterval(fetchReentries, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleDecision = async (requestId: number, decision: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/gate-reentry-requests/${requestId}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStaffToken()}` },
        body: JSON.stringify({})
      });
      if (res.ok) {
        fetchReentries();
        onRefresh();
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
        <AlertOctagon className="h-4 w-4 text-orange-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Same-Day Gate Re-Entry Approvals</h3>
      </div>
      {pendingReentries.length === 0 && <p className="text-xs text-slate-500">No pending re-entry requests.</p>}
      <div className="space-y-4">
        {pendingReentries.map(r => (
          <div key={r.request_id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-mono text-sm font-bold text-orange-400">{r.vrn || r.chassis_number}</div>
                <div className="text-[10px] text-slate-400 mt-1">Requested by: {r.requested_by_name || "—"}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{new Date(r.requested_at).toLocaleString("en-IN")}</div>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-slate-300 mb-4">
              Already had a job card closed today: <span className="font-bold text-slate-100">{r.prior_job_card_no}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDecision(r.request_id, "approve")}
                className="ds-button-success py-3 text-xs font-bold uppercase rounded-xl border border-emerald-600/30"
              >
                Approve
              </button>
              <button
                onClick={() => handleDecision(r.request_id, "reject")}
                className="py-3 bg-red-600/20 text-red-400 text-xs font-bold uppercase rounded-xl border border-red-600/30"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// AI Mode is workshop-wide and gates real API spend, so Managers / Service
// Advisors can only request activation — a GM/Admin/Developer decides here.
const GMAiModeApprovals: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const [state, setState] = useState<{ enabled: boolean; pendingRequests: number } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);

  const fetchAll = async () => {
    const headers = { Authorization: `Bearer ${getStaffToken()}` };
    try {
      const [sRes, rRes] = await Promise.all([
        fetch("/api/v1/ai-mode", { headers }),
        fetch("/api/v1/ai-mode/requests?status=PENDING", { headers })
      ]);
      if (sRes.ok) setState(await sRes.json());
      if (rRes.ok) setRequests(await rRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const setEnabled = async (enabled: boolean) => {
    try {
      const res = await fetch("/api/v1/ai-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStaffToken()}` },
        body: JSON.stringify({ enabled })
      });
      if (res.ok) fetchAll();
      else alert(`Failed: ${(await res.json()).error}`);
    } catch (e) {
      console.error(e);
    }
  };

  const decide = async (requestId: number, decision: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/v1/ai-mode/requests/${requestId}/${decision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getStaffToken()}` },
        body: JSON.stringify({})
      });
      if (res.ok) fetchAll();
      else alert(`Failed: ${(await res.json()).error}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Workshop AI Mode</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-100">
              AI is currently{" "}
              <span className={state?.enabled ? "text-emerald-400" : "text-red-400"}>
                {state === null ? "…" : state.enabled ? "ON" : "OFF"}
              </span>
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Switching this off stops every outbound AI call across the workshop — no suggestions, no API-key spend.
            </p>
          </div>
          {state && (
            <button
              onClick={() => setEnabled(!state.enabled)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${
                state.enabled
                  ? "bg-red-600/20 text-red-400 border-red-600/30"
                  : "ds-button-success border-emerald-600/30"
              }`}
            >
              {state.enabled ? "Switch Off" : "Switch On"}
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
          <AlertOctagon className="h-4 w-4 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Pending Activation Requests</h3>
        </div>
        {requests.length === 0 && <p className="text-xs text-slate-500">No pending activation requests.</p>}
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.request_id} className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
              <div className="mb-3">
                <div className="text-sm font-bold text-slate-100">{r.requested_by_name || "—"}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 capitalize">
                  {(r.requested_by_role || "").replace(/_/g, " ")}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {new Date(r.requested_at).toLocaleString("en-IN")}
                </div>
              </div>
              {r.reason && (
                <div className="bg-slate-900 border border-slate-800 p-2 rounded text-xs text-slate-300 mb-4">
                  Reason: {r.reason}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => decide(r.request_id, "approve")}
                  className="ds-button-success py-3 text-xs font-bold uppercase rounded-xl border border-emerald-600/30"
                >
                  Approve &amp; Enable
                </button>
                <button
                  onClick={() => decide(r.request_id, "reject")}
                  className="py-3 bg-red-600/20 text-red-400 text-xs font-bold uppercase rounded-xl border border-red-600/30"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

GMServiceCommandCenter.displayName = "GMServiceCommandCenter";
export default GMServiceCommandCenter;
