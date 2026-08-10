import React, { useEffect, useState, useCallback } from "react";
import { Camera, ShieldAlert, Plus, Trash2, CheckCircle2, RefreshCw, Video, KeyRound, Grid3x3, Truck } from "lucide-react";

const authHeaders = (): Record<string, string> => {
  const t = typeof localStorage !== "undefined" ? localStorage.getItem("wms_token") : null;
  return t ? { Authorization: `Bearer ${t}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

const SEV_STYLE: Record<string, string> = {
  critical: "bg-rose-500/10 border-rose-500/30 text-rose-300",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  info: "bg-slate-500/10 border-slate-500/30 text-slate-300",
};

const emptyCam = { camera_id: 0, name: "", zone: "", vendor: "", stream_url: "", external_ref: "", bay_id: "", enabled: true };

const SEV_DOT: Record<string, string> = { critical: "bg-rose-500", warning: "bg-amber-500", info: "bg-slate-400" };
const BAY_STATUS: Record<string, string> = {
  Active: "border-emerald-500/40", "In Progress": "border-emerald-500/40",
  Idle: "border-zinc-700", Waiting: "border-amber-500/40",
};

export default function CctvFloorSafety() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [bayView, setBayView] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [cam, setCam] = useState<any>(emptyCam);
  const [webhookKey, setWebhookKey] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const notify = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); };

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch("/api/cctv/alerts?status=open&limit=100", { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setAlerts(d.alerts || []);
    } catch { /* non-fatal */ }
  }, []);

  const fetchCameras = useCallback(async () => {
    try {
      const r = await fetch("/api/cctv/cameras", { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setCameras(d.cameras || []);
    } catch { /* non-fatal */ }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch("/api/cctv/config", { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setConfig(d.config);
    } catch { /* non-fatal */ }
  }, []);

  const fetchBays = useCallback(async () => {
    try {
      const r = await fetch("/api/bays", { headers: authHeaders() });
      const d = await r.json();
      if (Array.isArray(d)) setBays(d.filter((b: any) => b.is_active !== false));
    } catch { /* non-fatal */ }
  }, []);

  const fetchBayView = useCallback(async () => {
    try {
      const r = await fetch("/api/cctv/bay-view", { headers: authHeaders() });
      const d = await r.json();
      if (d.success) setBayView(d.bays || []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => {
    fetchAlerts(); fetchCameras(); fetchConfig(); fetchBays(); fetchBayView();
    const id = setInterval(() => { fetchAlerts(); fetchBayView(); }, 30000);
    return () => clearInterval(id);
  }, [fetchAlerts, fetchCameras, fetchConfig, fetchBays, fetchBayView]);

  const typeLabel = (v: string) => config?.alert_types?.find((t: any) => t.value === v)?.label || v;

  const ack = async (id: number) => {
    try {
      const r = await fetch(`/api/cctv/alerts/${id}/ack`, { method: "POST", headers: authHeaders() });
      if ((await r.json()).success) { setAlerts(prev => prev.filter(a => a.alert_id !== id)); }
    } catch { notify("Failed to acknowledge.", false); }
  };

  const saveCamera = async () => {
    if (!cam.name.trim()) { notify("Camera name is required.", false); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/cctv/cameras", { method: "POST", headers: authHeaders(), body: JSON.stringify(cam) });
      if ((await r.json()).success) { setCam(emptyCam); fetchCameras(); fetchBayView(); notify("Camera saved.", true); }
      else notify("Save failed.", false);
    } catch { notify("Network error.", false); } finally { setLoading(false); }
  };

  const removeCamera = async (id: number) => {
    try {
      const r = await fetch(`/api/cctv/cameras/${id}`, { method: "DELETE", headers: authHeaders() });
      if ((await r.json()).success) { fetchCameras(); fetchBayView(); if (cam.camera_id === id) setCam(emptyCam); }
    } catch { notify("Failed to delete.", false); }
  };

  const saveConfig = async (patch: any) => {
    setLoading(true);
    try {
      const r = await fetch("/api/cctv/config", { method: "POST", headers: authHeaders(), body: JSON.stringify(patch) });
      const d = await r.json();
      if (d.success) { setConfig(d.config); setWebhookKey(""); notify("Settings saved.", true); }
      else notify("Save failed.", false);
    } catch { notify("Network error.", false); } finally { setLoading(false); }
  };

  const webhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/cctv/alerts/ingest`;

  return (
    <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen text-zinc-100">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white">
          <Video className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">CCTV & Floor Safety</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Live safety alerts from your cameras, camera registry, and the analytics webhook.</p>
        </div>
      </div>

      {msg && (
        <div className={`text-xs font-semibold ${msg.ok ? "text-emerald-400" : "text-amber-400"}`}>{msg.text}</div>
      )}

      {/* Bay View */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Grid3x3 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Bay View</h2>
          <span className="text-[10px] text-zinc-500">— each bay with its mapped camera, current vehicle & safety alerts</span>
        </div>
        {bayView.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-8 border border-dashed border-zinc-800 rounded-xl">No bays configured.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {bayView.map(b => (
              <div key={b.bay_id} className={`bg-zinc-900/60 border rounded-xl p-3 ${b.open_alert_count > 0 ? "border-rose-500/50" : (BAY_STATUS[b.status] || "border-zinc-800")}`}>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black text-white">{b.bay_name || b.bay_code || `Bay ${b.bay_id}`}</div>
                  {b.open_alert_count > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-black text-rose-300">
                      <span className={`w-2 h-2 rounded-full ${SEV_DOT[b.top_alert?.severity] || "bg-rose-500"} animate-pulse`} />
                      {b.open_alert_count}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{b.status || "Idle"}</div>

                <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                  <Camera className={`w-3.5 h-3.5 ${b.camera ? "text-emerald-400" : "text-zinc-600"}`} />
                  {b.camera ? (
                    b.camera.stream_url
                      ? <a href={b.camera.stream_url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline truncate">{b.camera.name}</a>
                      : <span className="text-zinc-300 truncate">{b.camera.name}</span>
                  ) : <span className="text-zinc-600">No camera mapped</span>}
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  <Truck className={`w-3.5 h-3.5 ${b.current_job ? "text-sky-400" : "text-zinc-600"}`} />
                  {b.current_job
                    ? <span className="text-zinc-200 truncate">{b.current_job.vrn || b.current_job.job_card_no}</span>
                    : <span className="text-zinc-600">Empty</span>}
                </div>

                {b.top_alert && (
                  <div className="mt-2 text-[10px] font-bold text-rose-300 truncate">⚠ {typeLabel(b.top_alert.alert_type)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Alerts */}
      <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm font-bold text-white">Open Floor-Safety Alerts</h2>
            {alerts.length > 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-300">{alerts.length}</span>}
          </div>
          <button onClick={fetchAlerts} className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-900"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {alerts.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-8 border border-dashed border-zinc-800 rounded-xl">No open alerts — floor is clear.</div>
        ) : (
          <div className="space-y-2">
            {alerts.map(a => (
              <div key={a.alert_id} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${SEV_STYLE[a.severity] || SEV_STYLE.info}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm">{typeLabel(a.alert_type)}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80">{a.severity}</span>
                    {a.zone && <span className="text-[11px] opacity-80">· {a.zone}</span>}
                    {a.camera_name && <span className="text-[11px] opacity-70">· {a.camera_name}</span>}
                  </div>
                  {a.description && <div className="text-[11px] opacity-80 mt-0.5 truncate">{a.description}</div>}
                  <div className="text-[10px] opacity-60 mt-0.5">{a.detected_at}{a.confidence != null ? ` · conf ${a.confidence}` : ""}</div>
                </div>
                {a.snapshot_url && (
                  <a href={a.snapshot_url} target="_blank" rel="noreferrer" className="text-[11px] underline opacity-80 hover:opacity-100 shrink-0">Snapshot</a>
                )}
                <button onClick={() => ack(a.alert_id)} className="shrink-0 flex items-center gap-1 bg-zinc-900/70 hover:bg-zinc-800 text-zinc-200 text-[11px] font-bold px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ack
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Registry */}
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Camera Registry</h2>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <input value={cam.name} onChange={e => setCam({ ...cam, name: e.target.value })} placeholder="Name (e.g. Bay-3 Cam)" className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2 col-span-2" />
            <input value={cam.zone} onChange={e => setCam({ ...cam, zone: e.target.value })} placeholder="Zone / location" className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2" />
            <input value={cam.vendor} onChange={e => setCam({ ...cam, vendor: e.target.value })} placeholder="Vendor (Hikvision…)" className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2" />
            <input value={cam.stream_url} onChange={e => setCam({ ...cam, stream_url: e.target.value })} placeholder="Stream URL (rtsp://…)" className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2 col-span-2" />
            <input value={cam.external_ref} onChange={e => setCam({ ...cam, external_ref: e.target.value })} placeholder="Camera ref/ID the analytics sends" className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2 col-span-2" />
            <select value={cam.bay_id ?? ""} onChange={e => setCam({ ...cam, bay_id: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2 col-span-2 text-zinc-200">
              <option value="">— Map to bay (optional) —</option>
              {bays.map(b => <option key={b.bay_id} value={b.bay_id}>{b.bay_name || b.bay_code || `Bay ${b.bay_id}`}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={cam.enabled} onChange={e => setCam({ ...cam, enabled: e.target.checked })} className="h-4 w-4 accent-emerald-500" /> Enabled
            </label>
            <button onClick={saveCamera} disabled={loading} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> {cam.camera_id ? "Update" : "Add camera"}
            </button>
          </div>

          <div className="mt-4 divide-y divide-zinc-800/70 border-t border-zinc-800 pt-2">
            {cameras.length === 0 && <div className="text-xs text-zinc-600 py-4 text-center">No cameras registered yet.</div>}
            {cameras.map(c => (
              <div key={c.camera_id} className="flex items-center gap-2 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-100">{c.name} {!c.enabled && <span className="text-[10px] text-zinc-500">(disabled)</span>}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{[bays.find(b => Number(b.bay_id) === Number(c.bay_id))?.bay_name, c.zone, c.vendor, c.external_ref].filter(Boolean).join(" · ")}</div>
                </div>
                <button onClick={() => setCam({ ...emptyCam, ...c, enabled: !!c.enabled })} className="text-[11px] text-emerald-400 hover:text-emerald-300 px-2">Edit</button>
                <button onClick={() => removeCamera(c.camera_id)} className="text-zinc-500 hover:text-rose-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Config */}
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-white">Analytics Webhook</h2>
            {config && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${config.enabled && config.has_webhook_key ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                {config.enabled && config.has_webhook_key ? "Active" : config.has_webhook_key ? "Disabled" : "Needs key"}
              </span>
            )}
          </div>

          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Webhook URL (point your camera/VMS here)</label>
          <code className="block bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-emerald-300 px-3 py-2 mb-3 break-all">POST {webhookUrl}</code>

          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
            Shared secret {config?.has_webhook_key && <span className="text-emerald-400 normal-case">(set)</span>}
          </label>
          <div className="flex gap-2 mb-3">
            <input type="password" value={webhookKey} onChange={e => setWebhookKey(e.target.value)} placeholder={config?.has_webhook_key ? "•••••• (leave blank to keep)" : "set a long random secret"} className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-3 py-2" />
            <button onClick={() => saveConfig({ webhook_key: webhookKey })} disabled={loading || !webhookKey} className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold px-3 py-2 rounded-lg disabled:opacity-50">Save key</button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={!!config?.enabled} onChange={e => saveConfig({ enabled: e.target.checked })} className="h-4 w-4 accent-emerald-500" /> Ingestion enabled
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500">Dedupe (s)</span>
              <input type="number" defaultValue={config?.dedupe_seconds ?? 60} onBlur={e => saveConfig({ dedupe_seconds: e.target.value })} className="w-16 bg-zinc-900 border border-zinc-700 rounded-lg text-xs px-2 py-1" />
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
            <div className="font-bold text-zinc-400 mb-1">Sample payload the camera should POST (header <code className="text-emerald-300">X-CCTV-Key: &lt;secret&gt;</code>):</div>
            <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 overflow-x-auto text-[10px] text-zinc-300">{`{
  "camera_id": "BAY-3",
  "alert_type": "oil_spillage",
  "severity": "critical",
  "zone": "Service Bay 3",
  "confidence": 0.92,
  "snapshot_url": "https://.../snap.jpg",
  "detected_at": "2026-08-09T10:15:00Z"
}`}</pre>
            <div className="mt-2">Types: {config?.alert_types?.map((t: any) => t.value).join(", ")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
