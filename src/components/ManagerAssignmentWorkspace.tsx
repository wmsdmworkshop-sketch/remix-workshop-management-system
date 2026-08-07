import React, { useState, useEffect } from "react";
import { 
  Users, Sparkles, CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw, 
  ArrowRight, UserCheck, ShieldCheck, FileText, Check
} from "lucide-react";

export interface ManagerAssignmentWorkspaceProps {
  currentUser?: any;
  onRefresh?: () => void;
}

export const ManagerAssignmentWorkspace: React.FC<ManagerAssignmentWorkspaceProps> = React.memo(({
  currentUser,
  onRefresh
}) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIntake, setSelectedIntake] = useState<any | null>(null);

  // Recommendation state
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [selectedSaId, setSelectedSaId] = useState<string>("");
  const [selectedSaName, setSelectedSaName] = useState<string>("");
  const [isOverride, setIsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/pipeline/manager/queue", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch manager assignment queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleOpenAssignModal = async (intake: any) => {
    setSelectedIntake(intake);
    setIsOverride(false);
    setOverrideReason("");

    // Fetch AI recommendation
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch(`/api/pipeline/manager/recommendation/${intake.intakeId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const rec = data.data;
        setRecommendation(rec);
        setSelectedSaId(rec.recommendedSaId);
        setSelectedSaName(rec.recommendedSaName);
      }
    } catch (err) {
      console.warn("Failed to fetch SA recommendation:", err);
    }
  };

  const handleExecuteAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntake) return;

    setAssigning(true);
    try {
      const token = localStorage.getItem("dwip_token") || localStorage.getItem("token") || localStorage.getItem("wms_token");
      const res = await fetch("/api/pipeline/manager/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          intakeId: selectedIntake.intakeId,
          gateEntryId: selectedIntake.gateEntryId,
          assignedSaId: selectedSaId,
          assignedSaName: selectedSaName,
          isOverride,
          overrideReason: isOverride ? overrideReason : undefined,
          recommendationSaId: recommendation?.recommendedSaId,
          recommendationReason: recommendation?.reason
        })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✨ Service Advisor '${data.data?.assignedSaName}' successfully assigned! Job Card ${data.data?.jobCardId} created and transferred to SA workspace.`);
        setSelectedIntake(null);
        fetchQueue();
        if (onRefresh) onRefresh();
      } else {
        const err = await res.json();
        alert(`Assignment failed: ${err.error || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Assignment execution error: ${err.message}`);
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6 pb-24" lang="en">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                WORKSHOP MANAGER • MY ASSIGNMENT DESK
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Pending SA Workload Assignment
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {currentUser?.full_name || currentUser?.name || currentUser?.username || "Service Manager"}
            </h1>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${loading ? "animate-spin" : ""}`} />
          <span>Sync Desk</span>
        </button>
      </div>

      {/* MY ASSIGNMENTS PENDING Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              MY ASSIGNMENTS PENDING ({queue.length})
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            Workload & Competency Based SA Assignment
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No pending SA assignments.</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              All intake-completed vehicles have been assigned to Service Advisors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.map(item => (
              <div 
                key={item.intakeId}
                className={`p-4 rounded-2xl border transition-all space-y-3 shadow-lg ${
                  item.isBreached 
                    ? "bg-red-950/20 border-red-500/40" 
                    : "bg-slate-900 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-base font-black text-white block">
                      {item.vrn}
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">
                      Token: {item.tokenNumber}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    item.isBreached 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}>
                    {item.isBreached ? "SLA BREACHED" : "NEEDS ASSIGNMENT"}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-850 text-xs space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-bold text-slate-200">{item.visitCategory}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Confirmed Odo:</span>
                    <span className="font-mono font-bold text-slate-200">{item.confirmedOdometer} km</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Reception Waiting:</span>
                    <span className={`font-mono font-bold ${item.isBreached ? "text-red-400" : "text-amber-400"}`}>
                      {item.waitingMins} mins
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAssignModal(item)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>ASSIGN SERVICE ADVISOR</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {selectedIntake && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">STAGE 07-09 MANAGER SA ASSIGNMENT</span>
                <h3 className="text-lg font-black text-white">{selectedIntake.vrn} ({selectedIntake.tokenNumber})</h3>
              </div>
              <button onClick={() => setSelectedIntake(null)} className="text-slate-400 hover:text-slate-200 font-bold text-sm">✕</button>
            </div>

            {/* AI Recommendation Box */}
            {recommendation && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">AI WORKLOAD RECOMMENDATION</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recommended SA:</span>
                    <span className="font-bold text-white">{recommendation.recommendedSaName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Confidence Score:</span>
                    <span className="font-mono font-bold text-emerald-400">{Math.round(recommendation.confidenceScore * 100)}%</span>
                  </div>
                  <p className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-850">
                    📌 {recommendation.reason}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleExecuteAssignment} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Service Advisor</label>
                <select
                  value={selectedSaId}
                  onChange={(e) => {
                    const saId = e.target.value;
                    setSelectedSaId(saId);
                    const found = recommendation?.availableAdvisors?.find((a: any) => a.id === saId);
                    if (found) setSelectedSaName(found.name);
                    if (saId !== recommendation?.recommendedSaId) {
                      setIsOverride(true);
                    } else {
                      setIsOverride(false);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-200 outline-none"
                >
                  {(recommendation?.availableAdvisors || [
                    { id: "usr_service_advisor", name: "Shashi Kumar" },
                    { id: "usr_sa_2", name: "Rajesh Sharma" },
                    { id: "usr_sa_3", name: "Anand Verma" }
                  ]).map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.activeJcs || 0} active JCs)</option>
                  ))}
                </select>
              </div>

              {isOverride && (
                <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 space-y-2">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">AI RECOMMENDATION OVERRIDE GOVERNANCE</span>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="Provide mandatory reason for overriding AI workload recommendation..."
                    required
                    className="w-full bg-slate-900 border border-amber-500/40 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedIntake(null)}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  {assigning ? "Assigning SA..." : "Confirm & Transfer Ownership"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
});

ManagerAssignmentWorkspace.displayName = "ManagerAssignmentWorkspace";
export default ManagerAssignmentWorkspace;
