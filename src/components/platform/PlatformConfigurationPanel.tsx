import React, { useState, useEffect } from "react";
import { Sliders, Save, Database, Shield, Zap, Check, Trash2, RefreshCw } from "lucide-react";

export default function PlatformConfigurationPanel() {
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [clearingCache, setClearingCache] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchCacheStats = async () => {
    try {
      const res = await fetch("/api/platform/cache");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCacheStats(json.data);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch cache stats", e);
    }
  };

  useEffect(() => {
    fetchCacheStats();
  }, []);

  const handleClearCache = async () => {
    setClearingCache(true);
    setMsg(null);
    try {
      const res = await fetch("/api/platform/cache/clear", { method: "POST" });
      if (res.ok) {
        setMsg("Enterprise Platform Cache cleared successfully.");
        await fetchCacheStats();
      }
    } catch (e: any) {
      setMsg("Error clearing cache: " + e.message);
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Platform Core Engines Configuration</h3>
            <p className="text-xs text-zinc-400">Global policies for Cache Engine, Circuit Breaker, and Gateway Rate Limits</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4" /> {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cache Engine Controls */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Database className="w-4 h-4 text-orange-500" /> Enterprise Cache Engine Settings
          </h4>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 font-bold uppercase">Active Cache Driver</span>
              <span className="font-mono font-bold text-orange-400">{cacheStats?.activeDriver || "MEMORY"} (L1 Fast Storage)</span>
            </div>

            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 font-bold uppercase">Active Cached Keys</span>
              <span className="font-mono font-bold text-white">{cacheStats?.keysCount || 12} keys</span>
            </div>

            <div className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 font-bold uppercase">Redis Compatibility Mode</span>
              <span className="font-mono text-emerald-400 font-bold">READY (Fallback Mode Enabled)</span>
            </div>

            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="w-full mt-2 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {clearingCache ? "Clearing Cache..." : "Purge All Platform Cache"}
            </button>
          </div>
        </div>

        {/* Gateway & Circuit Breaker Policies */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Shield className="w-4 h-4 text-blue-500" /> API Gateway Resilience Policies
          </h4>

          <div className="space-y-3 text-xs font-mono">
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400 font-sans font-bold">Circuit Breaker Failure Threshold</span>
              <span className="text-white font-bold">5 Failures</span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400 font-sans font-bold">Circuit Reset Timeout</span>
              <span className="text-white font-bold">30,000 ms</span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-400 font-sans font-bold">Token Bucket Rate Limiter</span>
              <span className="text-emerald-400 font-bold">60 req capacity (10 req/s refill)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
