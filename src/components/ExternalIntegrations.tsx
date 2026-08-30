import { useEffect, useState } from "react";
import { Plug, ShieldCheck, Save, Loader2, CheckCircle2, XCircle, RefreshCw, KeyRound, Server, Database, ArrowRight, Layers, UploadCloud } from "lucide-react";
import { getStaffToken } from "../lib/authToken";
import { TMSA_ENDPOINT_CATALOG, TMSA_PRODUCTION_BASE_URL, type TmsaEndpointSpec } from "../integrations/tmsa/endpoints";

/**
 * External Integrations — paste the OFFICIAL Tata API base URL + credentials for
 * each provider (TMSA-CV / QRT / Fleet Edge). Slots stay inert until saved+enabled.
 * Secrets are write-only: the server returns only a "set" flag, never the key.
 */

interface Provider {
  provider_key: string;
  label: string;
  blurb: string;
  base_url: string;
  auth_mode: "api_key" | "bearer" | "oauth2";
  key_header: string;
  token_url: string;
  client_id: string;
  lookup_path: string;
  enabled: boolean;
  has_api_key: boolean;
  has_client_secret: boolean;
  configured: boolean;
  updated_at: string | null;
}

const authHeaders = (): Record<string, string> => {
  const token = getStaffToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
};

const AUTH_MODES = [
  { value: "api_key", label: "API Key (header)" },
  { value: "bearer", label: "Bearer token" },
  { value: "oauth2", label: "OAuth2 (client credentials)" },
];

export default function ExternalIntegrations() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [drafts, setDrafts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string; data?: any } | null>(null);
  const [showTmsaCatalog, setShowTmsaCatalog] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [massSync, setMassSync] = useState<any>(null);
  const [syncBusy, setSyncBusy] = useState(false);

  const fetchMassSyncStatus = async () => {
    try {
      const res = await fetch("/api/tmsa/mass-sync/status", { headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setMassSync(d.status);
      }
    } catch {
      // silent
    }
  };

  const handleStartMassSync = async () => {
    setSyncBusy(true);
    try {
      const res = await fetch("/api/tmsa/mass-sync/start", { method: "POST", headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setMassSync(d.status);
      }
    } catch (e: any) {
      setErr(e.message);
    }
    setSyncBusy(false);
  };

  const handlePauseMassSync = async () => {
    setSyncBusy(true);
    try {
      const res = await fetch("/api/tmsa/mass-sync/pause", { method: "POST", headers: authHeaders() });
      if (res.ok) {
        const d = await res.json();
        setMassSync(d.status);
      }
    } catch (e: any) {
      setErr(e.message);
    }
    setSyncBusy(false);
  };

  const handleReloadTsvs = async () => {
    setSyncBusy(true);
    try {
      const res = await fetch("/api/tmsa/mass-sync/reload", { method: "POST", headers: authHeaders() });
      if (res.ok) {
        await fetchMassSyncStatus();
      }
    } catch (e: any) {
      setErr(e.message);
    }
    setSyncBusy(false);
  };

  useEffect(() => {
    fetchMassSyncStatus();
    const interval = setInterval(fetchMassSyncStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/integrations/oem/config", { headers: authHeaders() });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Failed to load (admin only)."); }
      const d = await r.json();
      setProviders(d.providers || []);
      const init: Record<string, any> = {};
      (d.providers || []).forEach((p: Provider) => {
        init[p.provider_key] = {
          base_url: p.base_url || (p.provider_key === "tmsa_cv" ? TMSA_PRODUCTION_BASE_URL : ""),
          auth_mode: p.auth_mode,
          key_header: p.key_header || "X-API-Key",
          token_url: p.token_url,
          client_id: p.client_id,
          lookup_path: p.lookup_path,
          enabled: p.enabled,
          api_key: "",
          client_secret: "",
        };
      });
      setDrafts(init);
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setField = (key: string, field: string, value: any) =>
    setDrafts(d => ({ ...d, [key]: { ...d[key], [field]: value } }));

  const save = async (key: string) => {
    setBusy(key); setErr(null);
    try {
      const r = await fetch(`/api/integrations/oem/${key}/config`, { method: "POST", headers: authHeaders(), body: JSON.stringify(drafts[key]) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Save failed."); }
      const d = await r.json();
      setProviders(d.providers || []);
    } catch (e: any) { setErr(e.message); }
    setBusy(null);
  };

  const test = async (key: string) => {
    setBusy(`test-${key}`); setErr(null);
    try {
      const r = await fetch(`/api/integrations/oem/${key}/test`, { method: "POST", headers: authHeaders() });
      const d = await r.json();
      setTestResult(t => ({ ...t, [key]: { ok: !!d.ok, message: d.message || "" } }));
    } catch (e: any) { setTestResult(t => ({ ...t, [key]: { ok: false, message: e.message } })); }
    setBusy(null);
  };

  const syncTmsaMasters = async () => {
    setBusy("sync-tmsa"); setSyncResult(null);
    try {
      const r = await fetch("/api/integrations/tmsa/sync-masters", { method: "POST", headers: authHeaders() });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Master synchronization failed.");
      const errorCount = Object.keys(d.errors || {}).length;
      const successCount = Object.keys(d.results || {}).length;
      setSyncResult({
        ok: errorCount === 0 && successCount > 0,
        message: `Synced ${successCount} master catalogs (${errorCount} errors)`,
        data: d,
      });
    } catch (e: any) {
      setSyncResult({ ok: false, message: e.message });
    }
    setBusy(null);
  };

  if (loading) return <div className="flex items-center gap-2 text-slate-400 p-8 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading integrations…</div>;

  const tmsaProvider = providers.find(p => p.provider_key === "tmsa_cv");

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2"><Plug className="h-5 w-5 text-orange-400" /> External Integrations</h1>
          <p className="text-xs text-slate-400 mt-1">Paste the official Tata API base URL + credentials. Each slot stays inert until saved and enabled — no calls go out before then.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 hover:bg-slate-700 transition"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      {err && <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded p-2">{err}</p>}

      {providers.map((p) => {
        const d = drafts[p.provider_key] || {};
        const tr = testResult[p.provider_key];
        const isTmsa = p.provider_key === "tmsa_cv";

        return (
          <div key={p.provider_key} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {p.label}
                  {p.configured
                    ? <span className="text-[9px] font-bold text-emerald-300 bg-emerald-900/40 border border-emerald-700/50 rounded px-1.5 py-0.5 uppercase">Live</span>
                    : <span className="text-[9px] font-bold text-amber-300 bg-amber-900/30 border border-amber-700/40 rounded px-1.5 py-0.5 uppercase">Inert</span>}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{p.blurb}</p>
              </div>
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-300 cursor-pointer">
                <input type="checkbox" checked={!!d.enabled} onChange={e => setField(p.provider_key, "enabled", e.target.checked)} />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-slate-500">Base URL</label>
                <input value={d.base_url || ""} onChange={e => setField(p.provider_key, "base_url", e.target.value)}
                  placeholder={isTmsa ? TMSA_PRODUCTION_BASE_URL : "https://api.tatamotors.com/v1"}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500">Auth mode</label>
                <select value={d.auth_mode || "api_key"} onChange={e => setField(p.provider_key, "auth_mode", e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200">
                  {AUTH_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              {d.auth_mode !== "oauth2" ? (
                <>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1"><KeyRound className="h-3 w-3" /> API Key {p.has_api_key && <span className="text-emerald-400 normal-case">• stored</span>}</label>
                    <input type="password" value={d.api_key || ""} onChange={e => setField(p.provider_key, "api_key", e.target.value)}
                      placeholder={p.has_api_key ? "•••• leave blank to keep" : "paste key"}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500" />
                  </div>
                  {d.auth_mode === "api_key" && (
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500">Key header</label>
                      <input value={d.key_header || ""} onChange={e => setField(p.provider_key, "key_header", e.target.value)}
                        placeholder="X-API-Key"
                        className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500" />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Token URL</label>
                    <input value={d.token_url || ""} onChange={e => setField(p.provider_key, "token_url", e.target.value)}
                      placeholder="https://auth.tatamotors.com/oauth/token"
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Client ID</label>
                    <input value={d.client_id || ""} onChange={e => setField(p.provider_key, "client_id", e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Client Secret {p.has_client_secret && <span className="text-emerald-400 normal-case">• stored</span>}</label>
                    <input type="password" value={d.client_secret || ""} onChange={e => setField(p.provider_key, "client_secret", e.target.value)}
                      placeholder={p.has_client_secret ? "•••• leave blank to keep" : "paste secret"}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500" />
                  </div>
                </>
              )}

              {isTmsa && (
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Vehicle lookup path <span className="normal-case text-slate-600">(use {"{vrn}"} placeholder)</span></label>
                  <input value={d.lookup_path || ""} onChange={e => setField(p.provider_key, "lookup_path", e.target.value)}
                    placeholder="/api/tmsa-cv/sa/vehicle-inventory/"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-orange-500 font-mono text-[11px]" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button onClick={() => save(p.provider_key)} disabled={busy === p.provider_key}
                className="inline-flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-[11px] px-3 py-1.5 rounded uppercase tracking-wider transition">
                {busy === p.provider_key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
              </button>
              <button onClick={() => test(p.provider_key)} disabled={busy === `test-${p.provider_key}`}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-bold text-[11px] px-3 py-1.5 rounded uppercase tracking-wider border border-slate-700 transition">
                {busy === `test-${p.provider_key}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Test Connection
              </button>
              {isTmsa && (
                <button onClick={syncTmsaMasters} disabled={busy === "sync-tmsa" || !p.configured}
                  className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-sky-300 font-bold text-[11px] px-3 py-1.5 rounded uppercase tracking-wider border border-slate-700 transition">
                  {busy === "sync-tmsa" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />} Sync Master Catalogs
                </button>
              )}
              {tr && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ml-auto ${tr.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {tr.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {tr.message}
                </span>
              )}
              {isTmsa && syncResult && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ml-auto ${syncResult.ok ? "text-emerald-400" : "text-amber-400"}`}>
                  {syncResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {syncResult.message}
                </span>
              )}
            </div>

            {/* TMSA Microservices Catalog Table */}
            {isTmsa && (
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-orange-400" />
                    <h4 className="text-xs font-bold text-slate-200">TMSA Microservices Endpoint Directory (8 APIs)</h4>
                  </div>
                  <button onClick={() => setShowTmsaCatalog(v => !v)} className="text-[10px] text-orange-400 hover:underline">
                    {showTmsaCatalog ? "Collapse" : "Expand"}
                  </button>
                </div>

                {showTmsaCatalog && (
                  <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[9px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2">Microservice</th>
                          <th className="px-2 py-2">Subsystem</th>
                          <th className="px-2 py-2">Method</th>
                          <th className="px-3 py-2">Full URL</th>
                          <th className="px-3 py-2">Purpose</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {TMSA_ENDPOINT_CATALOG.map((ep) => (
                          <tr key={ep.key} className="hover:bg-slate-900/40 transition">
                            <td className="px-3 py-2 font-bold text-slate-200 whitespace-nowrap">{ep.name}</td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${ep.subsystem === "SA" ? "bg-blue-900/40 text-blue-300 border border-blue-800/40" : "bg-purple-900/40 text-purple-300 border border-purple-800/40"}`}>
                                {ep.subsystem}
                              </span>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${ep.method === "GET" ? "bg-emerald-950/60 text-emerald-300" : "bg-amber-950/60 text-amber-300"}`}>
                                {ep.method}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px] text-slate-400 break-all select-all">{ep.fullUrl}</td>
                            <td className="px-3 py-2 text-slate-400 text-[10px] max-w-xs">{ep.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Mass TMSA Vehicle History Sync & TSV Alignment Hub */}
            {isTmsa && massSync && (
              <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-950/60 p-4 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-orange-400" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Mass TMSA Vehicle History Sync & TSV Alignment</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        massSync.state === "RUNNING" ? "bg-amber-950 text-amber-300 border border-amber-800 animate-pulse" :
                        massSync.state === "COMPLETED" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
                        "bg-slate-800 text-slate-400"
                      }`}>
                        {massSync.state}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Pull & index national service records from all Tata workshops across India for all 2,951 vehicles in your fleet master.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {massSync.state === "RUNNING" ? (
                      <button
                        onClick={handlePauseMassSync}
                        disabled={syncBusy}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" /> Pause Sync
                      </button>
                    ) : (
                      <button
                        onClick={handleStartMassSync}
                        disabled={syncBusy}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-950/50"
                      >
                        <RefreshCw className="h-3 w-3" /> {massSync.percentComplete > 0 && massSync.percentComplete < 100 ? "Resume Sync" : "Start Full Fleet Sync"}
                      </button>
                    )}
                    <button
                      onClick={handleReloadTsvs}
                      disabled={syncBusy}
                      title="Reload 3 TSV Master Files"
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition"
                    >
                      Reload TSVs
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Progress: {massSync.processedVehicles?.toLocaleString()} / {massSync.totalVehicles?.toLocaleString()} Vehicles</span>
                    <span className="font-bold text-orange-400">{massSync.percentComplete}% Complete</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${massSync.percentComplete}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Fleet Master</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{massSync.tsvsLoaded?.vehicles?.toLocaleString() || 2951} Vehicles</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Local Devanand Visits</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{massSync.tsvsLoaded?.localVisits?.toLocaleString() || 23436} Visits</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Local Invoices</div>
                    <div className="text-sm font-bold text-slate-200 mt-0.5">{massSync.tsvsLoaded?.invoices?.toLocaleString() || 9857} Invoices</div>
                  </div>
                  <div className="p-2 rounded bg-orange-950/30 border border-orange-800/40">
                    <div className="text-[10px] text-orange-400 uppercase font-bold">Multi-Dealer TMSA History</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">+{massSync.externalVisitsAdded?.toLocaleString() || 0} External Visits</div>
                  </div>
                </div>

                {massSync.currentVrn && massSync.state === "RUNNING" && (
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                    Currently Syncing VRN: <span className="font-bold text-orange-300">{massSync.currentVrn}</span> ({massSync.currentChassis})
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
