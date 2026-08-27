import React, { useState, useEffect } from "react";
import { ShieldCheck, Camera, LogOut } from "lucide-react";
import { getStaffToken } from "../lib/authToken";

export interface SecurityWorkspaceProps {
  currentUser?: any;
}

export const SecurityWorkspace: React.FC<SecurityWorkspaceProps> = ({ currentUser }) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [selectedGatePass, setSelectedGatePass] = useState<any>(null);

  // Form states
  const [detectedVrn, setDetectedVrn] = useState<string>("");
  const [evidenceId, setEvidenceId] = useState<string>("");

  const authHeaders = (): Record<string, string> => {
    const token = getStaffToken() || currentUser?.token || "";
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  };

  const fetchData = async () => {
    try {
      const res = await fetch("/api/gate-out/security-queue", { headers: authHeaders() });
      if (res.ok) setQueue(await res.json());
    } catch (e) {
      console.error("Failed to fetch security queue", e);
    }
  };

  // Phase C: register a real rear-plate evidence record and use its id for gate-out.
  const captureEvidence = async () => {
    if (!selectedGatePass) return;
    try {
      const res = await fetch("/api/gate-out/evidence", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ jobId: selectedGatePass.job_id, gatePassId: selectedGatePass.gate_pass_id, type: "REAR_PLATE" }),
      });
      if (res.ok) {
        const d = await res.json();
        setEvidenceId(d.evidenceId);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Capture failed: ${err.error || "unknown"}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleGateOut = async () => {
    if (!selectedGatePass) return;
    try {
      const res = await fetch("/api/gate-out/gate-out", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          gatePassId: selectedGatePass.gate_pass_id,
          jobId: selectedGatePass.job_id,
          expectedVrn: selectedGatePass.vrn,
          detectedVrn,
          evidenceId,
          captureSource: "SECURITY_APP"
        })
      });
      if (res.ok) {
        alert("Vehicle Gate Out Successful");
        setSelectedGatePass(null);
        setDetectedVrn("");
        setEvidenceId("");
        fetchData();
      } else {
        const err = await res.json();
        alert(`Gate Out Failed: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="ds-button-success flex h-2 w-2 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Security Gate Workspace
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white mt-1 uppercase tracking-tight">
            Gate Out Guard
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Eligible for Gate Out */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
            <LogOut className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Expected Vehicles</h3>
          </div>
          {queue.length === 0 && <p className="text-xs text-slate-500">No vehicles waiting for gate out.</p>}
          <div className="space-y-3">
            {queue.map(gp => (
              <button 
                key={gp.gate_pass_id}
                onClick={() => {
                  setSelectedGatePass(gp);
                  setDetectedVrn(gp.vrn);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedGatePass?.gate_pass_id === gp.gate_pass_id
                    ? "bg-blue-600/10 border-blue-600/30 text-white" 
                    : "bg-slate-950/40 border-slate-850 text-slate-300 hover:border-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="font-mono text-lg font-bold text-emerald-400">{gp.vrn}</div>
                  {gp.sla_status === "BREACHED" && (
                    <span className="text-[9px] font-bold text-red-300 bg-red-900/40 border border-red-700/50 rounded px-1.5 py-0.5 uppercase">SLA Breached</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Pass: {gp.gate_pass_no} • {gp.release_basis}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Middle Column: Gate Out Action */}
        <div className="lg:col-span-2 space-y-6">
          {selectedGatePass ? (
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Verify Gate Out: {selectedGatePass.vrn}</h3>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Detected VRN Plate</label>
                <input 
                  type="text"
                  value={detectedVrn}
                  onChange={(e) => setDetectedVrn(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl p-3 text-lg font-mono text-slate-200 outline-none"
                  placeholder="Enter VRN"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Rear Plate Evidence ID (from ANPR/Camera)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={evidenceId}
                    onChange={(e) => setEvidenceId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-850 rounded-xl p-3 text-sm font-mono text-slate-200 outline-none"
                    placeholder="E.g. IMG-20260801-12345"
                  />
                  <button
                    onClick={captureEvidence}
                    className="px-4 bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Capture Rear Plate
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">* Registers a rear-plate evidence record. Gate-out is blocked until a valid capture exists.</p>
              </div>

              <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Gate Pass Auth</span>
                  <span className="font-bold text-emerald-400">{selectedGatePass.release_basis}</span>
                </div>
              </div>

              <button 
                onClick={handleGateOut}
                className="ds-button-success w-full py-4 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-colors"
              >
                Confirm Gate Out
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg flex flex-col items-center justify-center text-center">
              <ShieldCheck className="h-12 w-12 text-slate-700 mb-4" />
              <h3 className="text-slate-300 font-bold">Select Vehicle</h3>
              <p className="text-xs text-slate-500 mt-2">Select an eligible vehicle from the queue to process gate out.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityWorkspace;
