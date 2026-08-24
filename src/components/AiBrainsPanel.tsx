import React, { useState, useEffect } from "react";
import { Brain, RefreshCw, Activity, AlertCircle, CheckCircle2, Zap } from "lucide-react";
import { staffAuthHeaders } from "../lib/authToken";

interface BrainHealth {
  brain_id: string;
  brain_name: string;
  tier: string;
  role_description: string;
  status: string;
  total_invocations: number;
  total_errors: number;
  last_active_at: string | null;
  last_error: string | null;
}

const BRAIN_ACCENT: Record<string, string> = {
  SIGNA: "text-amber-400",
  SETU: "text-sky-400",
  DISHA: "text-emerald-400",
};

export default function AiBrainsPanel() {
  const [brains, setBrains] = useState<BrainHealth[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SIGNA test form
  const [vehicleModel, setVehicleModel] = useState("Tata Signa 4830.T");
  const [complaint, setComplaint] = useState("");
  const [signaResult, setSignaResult] = useState<any>(null);
  const [running, setRunning] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, activityRes] = await Promise.all([
        fetch("/api/v1/ai-brains/health", { headers: staffAuthHeaders() }),
        fetch("/api/v1/ai-brains/activity?limit=20", { headers: staffAuthHeaders() }),
      ]);
      if (healthRes.ok) {
        const data = await healthRes.json();
        setBrains(data.brains || []);
      } else if (healthRes.status === 403) {
        setError("Access denied — AI Brains are visible to the Developer role only.");
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivity(data.activity || []);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load AI Brains status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const runSigna = async () => {
    if (!complaint.trim()) return;
    setRunning("SIGNA");
    setSignaResult(null);
    try {
      const res = await fetch("/api/v1/ai-brains/signa/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...staffAuthHeaders() },
        body: JSON.stringify({ vehicleModel, complaint }),
      });
      const data = await res.json();
      if (res.ok) setSignaResult(data.suggestion);
      else setSignaResult({ error: data.error });
    } catch (e: any) {
      setSignaResult({ error: e.message });
    } finally {
      setRunning(null);
      fetchHealth();
    }
  };

  const runSetu = async () => {
    setRunning("SETU");
    try {
      await fetch("/api/v1/ai-brains/setu/observe", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...staffAuthHeaders() },
        body: JSON.stringify({}),
      });
    } finally {
      setRunning(null);
      fetchHealth();
    }
  };

  const runDisha = async () => {
    setRunning("DISHA");
    try {
      await fetch("/api/v1/ai-brains/disha/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...staffAuthHeaders() },
        body: JSON.stringify({ periodDays: 7 }),
      });
    } finally {
      setRunning(null);
      fetchHealth();
    }
  };

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6 pb-24" lang="en">
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-violet-400">AI Brains — Developer Console</span>
            <h2 className="text-lg font-bold text-white">SIGNA · SETU · DISHA</h2>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {brains.map((b) => {
          const accentClass = BRAIN_ACCENT[b.brain_id] || "text-slate-400";
          return (
            <div key={b.brain_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${accentClass}`}>{b.tier}</span>
                  <h3 className="text-xl font-black text-white">{b.brain_name}</h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                    b.status === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : b.status === "ERROR"
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {b.status === "ACTIVE" ? <CheckCircle2 className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                  {b.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{b.role_description}</p>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <p className="text-lg font-black text-white">{b.total_invocations}</p>
                  <p className="text-[9px] text-slate-500 uppercase">Runs</p>
                </div>
                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg">
                  <p className="text-lg font-black text-rose-400">{b.total_errors}</p>
                  <p className="text-[9px] text-slate-500 uppercase">Errors</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Last active: {b.last_active_at ? new Date(b.last_active_at).toLocaleString() : "Never"}
              </p>
              {b.last_error && (
                <p className="text-[10px] text-rose-400 leading-relaxed">Last error: {b.last_error.slice(0, 120)}</p>
              )}
              {b.brain_id === "SETU" && (
                <button
                  onClick={runSetu}
                  disabled={running === "SETU"}
                  className="w-full py-2 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5" /> {running === "SETU" ? "Observing..." : "Run Observation Now"}
                </button>
              )}
              {b.brain_id === "DISHA" && (
                <button
                  onClick={runDisha}
                  disabled={running === "DISHA"}
                  className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5" /> {running === "DISHA" ? "Analyzing..." : "Run 7-Day Analysis Now"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* SIGNA test console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-amber-400">Test SIGNA (Tactical Brain)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="Vehicle model"
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
          />
          <input
            value={complaint}
            onChange={(e) => setComplaint(e.target.value)}
            placeholder="Complaint, e.g. 'AdBlue warning light, low power'"
            className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white"
          />
        </div>
        <button
          onClick={runSigna}
          disabled={running === "SIGNA" || !complaint.trim()}
          className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
        >
          {running === "SIGNA" ? "Thinking..." : "Get Suggestion"}
        </button>
        {signaResult && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 space-y-2">
            {signaResult.error ? (
              <p className="text-rose-400">{signaResult.error}</p>
            ) : (
              <>
                <p><span className="text-slate-500">Recommended action:</span> {signaResult.recommendedAction}</p>
                <p><span className="text-slate-500">Confidence:</span> {signaResult.confidence}</p>
                {signaResult.historicalReference?.length > 0 && (
                  <div>
                    <span className="text-slate-500">Based on real cases:</span>
                    <ul className="list-disc list-inside">
                      {signaResult.historicalReference.map((r: any, i: number) => (
                        <li key={i}>{r.reference} ({r.date}) — {r.outcome}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-3">Recent Activity</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activity.length === 0 && <p className="text-xs text-slate-500">No activity recorded yet.</p>}
          {activity.map((a) => (
            <div key={a.log_id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-2 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded font-black shrink-0 ${a.success ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                {a.brain_id}
              </span>
              <div className="min-w-0">
                <p className="text-slate-300 truncate">{a.output_summary || a.input_summary}</p>
                <p className="text-slate-600">{new Date(a.created_at).toLocaleString()} · {a.duration_ms}ms · by {a.triggered_by}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
