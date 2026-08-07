import React, { useState, useEffect } from "react";
import { Settings, Save, Power, Check, AlertCircle, RefreshCw, Globe, Shield, Clock } from "lucide-react";

export interface IntegrationSystemConfig {
  id: string;
  code: string;
  name: string;
  baseUrl: string;
  authType: 'OAUTH2' | 'API_KEY' | 'BASIC' | 'JWT' | 'CUSTOM';
  timeoutMs: number;
  retryCount: number;
  cacheDurationSec: number;
  enabled: boolean;
  environment: 'DEV' | 'STAGING' | 'PILOT' | 'PRODUCTION';
  createdAt: string;
  updatedAt: string;
}

export default function ExternalSystemsManager() {
  const [configs, setConfigs] = useState<IntegrationSystemConfig[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<IntegrationSystemConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/platform/systems");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setConfigs(json.data);
          if (!selectedSystem && json.data.length > 0) {
            setSelectedSystem(json.data[0]);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch system configurations", e);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggleStatus = async (code: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/platform/systems/${code}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setConfigs(prev => prev.map(c => c.code === code ? json.data : c));
          if (selectedSystem?.code === code) {
            setSelectedSystem(json.data);
          }
          setMessage({ text: `System ${code} ${!currentEnabled ? "enabled" : "disabled"} successfully.`, type: "success" });
        }
      }
    } catch (e: any) {
      setMessage({ text: `Failed to toggle system status: ${e.message}`, type: "error" });
    }
  };

  const handleSave = async () => {
    if (!selectedSystem) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/platform/systems/${selectedSystem.code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedSystem)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setConfigs(prev => prev.map(c => c.code === selectedSystem.code ? json.data : c));
          setSelectedSystem(json.data);
          setMessage({ text: `Configuration for ${selectedSystem.name} saved successfully!`, type: "success" });
        }
      }
    } catch (e: any) {
      setMessage({ text: `Error saving configuration: ${e.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
      {/* Left Column: Systems Selector List */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-orange-500" />
            Registered Systems
          </h3>
          <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded font-mono">
            {configs.length} Configured
          </span>
        </div>

        <div className="space-y-2">
          {configs.map((sys) => (
            <div
              key={sys.code}
              onClick={() => setSelectedSystem(sys)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedSystem?.code === sys.code
                  ? "bg-orange-500/10 border-orange-500/50 text-white"
                  : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-zinc-800 text-orange-400 border border-zinc-700 font-mono">
                  {sys.code}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(sys.code, sys.enabled);
                  }}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    sys.enabled
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"
                  }`}
                  title={sys.enabled ? "Disable Integration" : "Enable Integration"}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              <div className="font-bold text-sm text-white mt-2">{sys.name}</div>
              <div className="text-xs text-zinc-400 font-mono truncate mt-1">{sys.baseUrl}</div>

              <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-2 font-mono">
                <span>Auth: {sys.authType}</span>
                <span className={`font-semibold ${sys.enabled ? "text-emerald-400" : "text-zinc-500"}`}>
                  {sys.enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Detailed System Configuration Form */}
      {selectedSystem && (
        <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-500" />
                {selectedSystem.name} ({selectedSystem.code})
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Manage base URL, authentication flow, retry policy, and execution parameters
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg transition-colors shadow-lg shadow-orange-900/20"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {message.type === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">External System Name</label>
              <input
                type="text"
                value={selectedSystem.name}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Base Endpoint URL</label>
              <input
                type="text"
                value={selectedSystem.baseUrl}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, baseUrl: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Authentication Type</label>
              <select
                value={selectedSystem.authType}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, authType: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
              >
                <option value="OAUTH2">OAuth 2.0 (Bearer Token)</option>
                <option value="API_KEY">API Key Header</option>
                <option value="JWT">JSON Web Token (JWT)</option>
                <option value="BASIC">Basic Auth (Credentials)</option>
                <option value="CUSTOM">Custom Gateway Connector</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Target Environment</label>
              <select
                value={selectedSystem.environment}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, environment: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
              >
                <option value="DEV">Development (DEV)</option>
                <option value="STAGING">Staging Sandbox</option>
                <option value="PILOT">Pilot Site Environment</option>
                <option value="PRODUCTION">Production Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={selectedSystem.timeoutMs}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, timeoutMs: parseInt(e.target.value) || 5000 })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Max Retry Count</label>
              <input
                type="number"
                value={selectedSystem.retryCount}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, retryCount: parseInt(e.target.value) || 3 })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Cache Duration (Seconds)</label>
              <input
                type="number"
                value={selectedSystem.cacheDurationSec}
                onChange={(e) => setSelectedSystem({ ...selectedSystem, cacheDurationSec: parseInt(e.target.value) || 3600 })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-xs font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">Integration Status</label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSystem({ ...selectedSystem, enabled: !selectedSystem.enabled })}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-colors flex items-center gap-2 ${
                    selectedSystem.enabled
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {selectedSystem.enabled ? "ENABLED & ACTIVE" : "DISABLED"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
