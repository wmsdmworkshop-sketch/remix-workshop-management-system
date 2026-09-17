import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera, RefreshCw, AlertTriangle, CheckCircle2, Trash2, Plus, Save,
  ShieldAlert, MapPin, Bell, Activity, Loader2, Link2, ExternalLink, Car,
} from "lucide-react";
import { staffAuthHeaders } from "../lib/authToken";

/**
 * CCTV & Floor Safety — the operator screen for the CCTV hub.
 *
 * WHY THIS FILE EXISTS AGAIN
 *
 * The backend (`src/integrations/cctv-analytics.ts` + the 9 routes at
 * `server.ts` ~7743-7870) has always been complete and real, but the screen was
 * deleted in the 2026-09-06 Administration prune (22 tabs -> 7). Nothing called
 * any of the endpoints, the notification bell raised a "Floor-Safety Alerts"
 * alert whose `link: "cctv-safety"` pointed at a tab that no longer existed
 * (clicking it bounced the user to their role's first screen), and the ingest
 * webhook could not be reached from outside the app at all. This screen is the
 * missing half.
 *
 * WHAT DWIP DOES **NOT** DO
 *
 * It does not decode video and does not run analytics. A camera / NVR / edge-AI
 * box POSTs a detection to `POST /api/cctv/alerts/ingest` with an `X-CCTV-Key`
 * header; DWIP turns that into an actionable feed. `stream_url` is stored per
 * camera and surfaced as an "open camera" link — deliberately NOT embedded as a
 * player, because browsers cannot play RTSP and the Android WebView cannot be
 * relied on for MJPEG.
 *
 * REAL DATA ONLY: every number here comes from the API. Absent data renders as
 * an honest empty state, never a placeholder figure.
 */

interface CctvAlert {
  alert_id: number;
  camera_ref: string | null;
  camera_name: string | null;
  alert_type: string | null;
  severity: string | null;
  zone: string | null;
  description: string | null;
  snapshot_url: string | null;
  confidence: number | string | null;
  detected_at: string | null;
  status: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

interface CctvCamera {
  camera_id: number;
  name: string | null;
  zone: string | null;
  vendor: string | null;
  stream_url: string | null;
  external_ref: string | null;
  bay_id: number | null;
  enabled: number | boolean | null;
}

interface BayRow {
  bay_id: number;
  bay_name: string | null;
  bay_code: string | null;
  status: string | null;
  camera: { camera_id: number; name: string; stream_url: string | null; enabled: boolean } | null;
  current_job: { job_id: number; job_card_no: string; vrn: string; status: string } | null;
  open_alert_count: number;
  top_alert: { alert_type: string; severity: string } | null;
}

interface CctvConfig {
  dedupe_seconds: number;
  enabled: boolean;
  has_webhook_key: boolean;
  alert_types: { value: string; label: string; defaultSeverity: string }[];
}

/** Fallback labels, used only when the server has not supplied its own list. */
const ALERT_LABELS: Record<string, string> = {
  idle_manpower: "Idle Manpower",
  oil_spillage: "Oil Spillage",
  object_on_floor: "Object on Floor",
  unidentified_person: "Unidentified Person",
  ppe_violation: "PPE Violation",
  loitering: "Loitering",
  fire_smoke: "Fire / Smoke",
  intrusion: "Intrusion",
  custom: "Custom",
};

/**
 * mysql2 hands DATETIME columns back as JS Date objects, which React refuses to
 * render ("Objects are not valid as a React child" — a crash, not a blank cell).
 * Every timestamp below therefore goes through this, and anything unparseable
 * renders as an em dash rather than "Invalid Date".
 */
function fmtWhen(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const d = value instanceof Date ? value : new Date(String(value));
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function severityTone(sev: string | null | undefined): { rail: string; chip: string; label: string } {
  switch (String(sev || "").toLowerCase()) {
    case "critical":
      return { rail: "bg-red-500", chip: "bg-red-500/15 text-red-300 border-red-500/40", label: "CRITICAL" };
    case "warning":
      return { rail: "bg-amber-500", chip: "bg-amber-500/15 text-amber-300 border-amber-500/40", label: "WARNING" };
    case "info":
      return { rail: "bg-sky-500", chip: "bg-sky-500/15 text-sky-300 border-sky-500/40", label: "INFO" };
    default:
      return { rail: "bg-zinc-600", chip: "bg-zinc-800 text-zinc-400 border-zinc-700", label: "—" };
  }
}

const isEnabled = (v: unknown) => v === true || Number(v) === 1;

type TabKey = "alerts" | "cameras" | "bays" | "settings";

interface Props {
  /** Optional — the workspace passes this down. Falls back to inline messages. */
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}

export default function CctvFloorSafety({ showToast }: Props) {
  const [tab, setTab] = useState<TabKey>("alerts");

  const [alerts, setAlerts] = useState<CctvAlert[]>([]);
  const [cameras, setCameras] = useState<CctvCamera[]>([]);
  const [bays, setBays] = useState<BayRow[]>([]);
  const [config, setConfig] = useState<CctvConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Alerts filter is client-side over the fetched window, so switching it does
  // not re-hit the API; the API's own `status` param stays fixed at "all".
  const [onlyOpen, setOnlyOpen] = useState(false);

  const notify = useCallback(
    (msg: string, type: "success" | "error" | "info" = "info") => {
      if (showToast) showToast(msg, type);
      else if (type === "error") setError(msg);
    },
    [showToast]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [aRes, cRes, bRes, cfgRes] = await Promise.all([
        fetch("/api/cctv/alerts?limit=200", { headers: staffAuthHeaders() }),
        fetch("/api/cctv/cameras", { headers: staffAuthHeaders() }),
        fetch("/api/cctv/bay-view", { headers: staffAuthHeaders() }),
        fetch("/api/cctv/config", { headers: staffAuthHeaders() }),
      ]);

      if (aRes.status === 403 || cfgRes.status === 403) {
        setError("Access denied — CCTV & Floor Safety is restricted to admin, developer and GM Service.");
        return;
      }

      if (aRes.ok) setAlerts((await aRes.json()).alerts || []);
      if (cRes.ok) setCameras((await cRes.json()).cameras || []);
      if (bRes.ok) setBays((await bRes.json()).bays || []);
      if (cfgRes.ok) setConfig((await cfgRes.json()).config || null);

      // Surface a partial failure rather than silently showing an empty screen.
      const failed = [
        !aRes.ok && "alerts", !cRes.ok && "cameras", !bRes.ok && "bay view", !cfgRes.ok && "settings",
      ].filter(Boolean);
      if (failed.length) {
        setError(`Could not load: ${failed.join(", ")}. Figures below may be incomplete.`);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to reach the CCTV service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCount = alerts.filter((a) => String(a.status || "").toUpperCase() === "OPEN").length;
  const criticalOpen = alerts.filter(
    (a) => String(a.status || "").toUpperCase() === "OPEN" && String(a.severity).toLowerCase() === "critical"
  ).length;
  const visibleAlerts = onlyOpen
    ? alerts.filter((a) => String(a.status || "").toUpperCase() === "OPEN")
    : alerts;

  const alertLabel = (t: string | null) =>
    config?.alert_types.find((x) => x.value === t)?.label || ALERT_LABELS[String(t || "")] || (t || "Custom");

  const camerasWithStream = cameras.filter((c) => c.stream_url).length;
  const webhookUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/api/cctv/alerts/ingest` : "/api/cctv/alerts/ingest"),
    []
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  async function acknowledge(alertId: number) {
    setBusy(`ack-${alertId}`);
    try {
      const res = await fetch(`/api/cctv/alerts/${alertId}/ack`, {
        method: "POST",
        headers: staffAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "Acknowledge failed");
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === alertId ? { ...a, status: "ACKNOWLEDGED" } : a))
      );
      notify("Alert acknowledged.", "success");
    } catch (e: any) {
      notify(e?.message || "Could not acknowledge the alert.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function saveCamera(cam: Partial<CctvCamera> & { name?: string }) {
    setBusy(cam.camera_id ? `cam-${cam.camera_id}` : "cam-new");
    try {
      const res = await fetch("/api/cctv/cameras", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...staffAuthHeaders() },
        body: JSON.stringify(cam),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "Save failed");
      notify(cam.camera_id ? "Camera updated." : "Camera registered.", "success");
      await load();
      return true;
    } catch (e: any) {
      notify(e?.message || "Could not save the camera.", "error");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function removeCamera(cam: CctvCamera) {
    if (!window.confirm(`Remove camera "${cam.name || cam.camera_id}"? Alerts already recorded are kept.`)) return;
    setBusy(`del-${cam.camera_id}`);
    try {
      const res = await fetch(`/api/cctv/cameras/${cam.camera_id}`, {
        method: "DELETE",
        headers: staffAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) throw new Error(data.error || "Delete failed");
      notify("Camera removed.", "success");
      await load();
    } catch (e: any) {
      notify(e?.message || "Could not remove the camera.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function saveConfig(patch: Record<string, unknown>) {
    setBusy("config");
    try {
      const res = await fetch("/api/cctv/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...staffAuthHeaders() },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.config) throw new Error(data.error || "Save failed");
      setConfig(data.config);
      notify("CCTV settings saved.", "success");
    } catch (e: any) {
      notify(e?.message || "Could not save CCTV settings.", "error");
    } finally {
      setBusy(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const SUB_TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: "alerts", label: "Alert Feed", icon: Bell },
    { key: "cameras", label: "Cameras", icon: Camera },
    { key: "bays", label: "Bay View", icon: MapPin },
    { key: "settings", label: "Settings", icon: ShieldAlert },
  ];

  return (
    <div className="space-y-5">
      {/* Header + live counts. Counts are computed from fetched rows, never assumed. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="ds-title flex items-center gap-2">
            <Camera className="h-6 w-6 text-orange-500" />
            CCTV &amp; Floor Safety
          </h2>
          <p className="ds-body text-zinc-400 mt-1">
            Detections pushed by your own cameras / NVR / edge-AI boxes. DWIP does not analyse video.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="ds-button-secondary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Open alerts" value={alerts.length ? openCount : "—"} tone={openCount > 0 ? "text-amber-400" : "text-zinc-200"} />
        <Stat label="Critical open" value={alerts.length ? criticalOpen : "—"} tone={criticalOpen > 0 ? "text-red-400" : "text-zinc-200"} />
        <Stat label="Cameras registered" value={cameras.length ? cameras.length : "—"} tone="text-zinc-200" />
        <Stat
          label="Ingestion"
          value={config ? (config.enabled ? "ENABLED" : "DISABLED") : "—"}
          tone={config?.enabled ? "text-emerald-400" : "text-zinc-400"}
        />
      </div>

      {(error || (config && !config.has_webhook_key)) && (
        <div className="space-y-2">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {config && !config.has_webhook_key && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>No shared secret is set, so the ingest webhook refuses every request (503).</strong>{" "}
                Set one in <button className="underline" onClick={() => setTab("settings")}>Settings</button> before
                pointing any camera at the endpoint.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                active ? "bg-zinc-800 text-orange-400 border border-zinc-700/60" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.key === "alerts" && openCount > 0 && (
                <span className="min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                  {openCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading && alerts.length === 0 && cameras.length === 0 ? (
        <div className="ds-card flex items-center justify-center gap-3 text-zinc-400 text-sm py-12">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading CCTV data…
        </div>
      ) : tab === "alerts" ? (
        <AlertsTab
          alerts={visibleAlerts}
          onlyOpen={onlyOpen}
          setOnlyOpen={setOnlyOpen}
          openCount={openCount}
          total={alerts.length}
          alertLabel={alertLabel}
          busy={busy}
          onAck={acknowledge}
        />
      ) : tab === "cameras" ? (
        <CamerasTab
          cameras={cameras}
          camerasWithStream={camerasWithStream}
          busy={busy}
          onSave={saveCamera}
          onDelete={removeCamera}
        />
      ) : tab === "bays" ? (
        <BayViewTab bays={bays} alertLabel={alertLabel} />
      ) : (
        <SettingsTab config={config} busy={busy} webhookUrl={webhookUrl} onSave={saveConfig} />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className="ds-card p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-black ${tone}`}>{value}</div>
    </div>
  );
}

function AlertsTab({
  alerts, onlyOpen, setOnlyOpen, openCount, total, alertLabel, busy, onAck,
}: {
  alerts: CctvAlert[];
  onlyOpen: boolean;
  setOnlyOpen: (v: boolean) => void;
  openCount: number;
  total: number;
  alertLabel: (t: string | null) => string;
  busy: string | null;
  onAck: (id: number) => void;
}) {
  return (
    <div className="ds-card p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
          <Activity className="h-4 w-4 text-orange-500" />
          Detection feed
          <span className="text-zinc-500 font-medium">
            ({alerts.length} shown{total !== alerts.length ? ` of ${total}` : ""})
          </span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900/70 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => setOnlyOpen(false)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${!onlyOpen ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
          >
            All
          </button>
          <button
            onClick={() => setOnlyOpen(true)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${onlyOpen ? "bg-zinc-800 text-white" : "text-zinc-400"}`}
          >
            Open ({openCount})
          </button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-zinc-500">
          No {onlyOpen ? "open " : ""}alerts recorded yet.
          <div className="mt-1 text-xs text-zinc-600">
            Alerts appear here as soon as a camera posts to the ingest endpoint.
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/80">
          {alerts.map((a) => {
            const tone = severityTone(a.severity);
            const ack = String(a.status || "").toUpperCase() !== "OPEN";
            return (
              <li key={a.alert_id} className="flex gap-3 px-4 py-3 hover:bg-zinc-900/50">
                <span className={`mt-1 h-9 w-1 shrink-0 rounded-full ${tone.rail}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${tone.chip}`}>
                      {tone.label}
                    </span>
                    <span className="text-sm font-bold text-zinc-100">{alertLabel(a.alert_type)}</span>
                    {ack && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="h-2.5 w-2.5" /> ACK
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                    <span>{a.camera_name || a.camera_ref || "Unknown camera"}</span>
                    {a.zone && <span>· {a.zone}</span>}
                    <span>· {fmtWhen(a.detected_at)}</span>
                    {a.confidence !== null && a.confidence !== undefined && a.confidence !== "" && (
                      <span>· confidence {Number(a.confidence).toFixed(2)}</span>
                    )}
                  </div>
                  {a.description && <p className="mt-1 text-xs text-zinc-300">{a.description}</p>}
                  {ack && (
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Acknowledged by {a.acknowledged_by || "—"} · {fmtWhen(a.acknowledged_at)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {a.snapshot_url && (
                    <a
                      href={a.snapshot_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300"
                    >
                      <ExternalLink className="h-3 w-3" /> Snapshot
                    </a>
                  )}
                  {!ack && (
                    <button
                      onClick={() => onAck(a.alert_id)}
                      disabled={busy === `ack-${a.alert_id}`}
                      className="ds-button-secondary h-7 px-2 text-[10px]"
                    >
                      {busy === `ack-${a.alert_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                      Acknowledge
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CamerasTab({
  cameras, camerasWithStream, busy, onSave, onDelete,
}: {
  cameras: CctvCamera[];
  camerasWithStream: number;
  busy: string | null;
  onSave: (c: Partial<CctvCamera>) => Promise<boolean>;
  onDelete: (c: CctvCamera) => void;
}) {
  const empty = { camera_id: undefined, name: "", zone: "", vendor: "", stream_url: "", external_ref: "", bay_id: "", enabled: true } as any;
  const [form, setForm] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-zinc-400">
          <strong className="text-zinc-200">{cameras.length}</strong> registered ·{" "}
          <strong className="text-zinc-200">{camerasWithStream}</strong> with a stream link
          {cameras.length > camerasWithStream && (
            <span className="text-zinc-500"> · {cameras.length - camerasWithStream} without one</span>
          )}
        </div>
        <button
          className="ds-button-primary"
          onClick={() => { setForm(empty); setOpen((o) => !o); }}
        >
          <Plus className="h-4 w-4" /> {open ? "Close form" : "Register camera"}
        </button>
      </div>

      {open && (
        <div className="ds-card space-y-4">
          <h3 className="ds-subtitle">{form.camera_id ? "Edit camera" : "New camera"}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="ds-label">Name *</label>
              <input className="ds-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Gate Camera 01" />
            </div>
            <div>
              <label className="ds-label">Zone</label>
              <input className="ds-input" value={form.zone} onChange={(e) => set("zone", e.target.value)} placeholder="Gate / Bay 3 / Wash" />
            </div>
            <div>
              <label className="ds-label">Vendor</label>
              <input className="ds-input" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Hikvision / Dahua / YOLO box" />
            </div>
            <div>
              <label className="ds-label">Device reference</label>
              <input
                className="ds-input"
                value={form.external_ref}
                onChange={(e) => set("external_ref", e.target.value)}
                placeholder="CAM-GATE-01"
              />
              <p className="mt-1 text-[10px] text-zinc-500">
                Must match the <code>camera_id</code> the device sends, or alerts will show as “Unknown camera”.
              </p>
            </div>
            <div>
              <label className="ds-label">Bay</label>
              <input
                className="ds-input"
                type="number"
                value={form.bay_id}
                onChange={(e) => set("bay_id", e.target.value)}
                placeholder="Optional — links this camera to a bay"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="ds-label">Stream / snapshot URL</label>
              <input
                className="ds-input"
                value={form.stream_url}
                onChange={(e) => set("stream_url", e.target.value)}
                placeholder="rtsp://… or http://…/snapshot.jpg"
              />
              <p className="mt-1 text-[10px] text-zinc-500">
                Stored for operator reference only — this screen links out to it rather than embedding a player.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={!!form.enabled} onChange={(e) => set("enabled", e.target.checked)} />
              Enabled
            </label>
            <div className="flex gap-2">
              <button className="ds-button-secondary" onClick={() => { setForm(empty); setOpen(false); }}>Cancel</button>
              <button
                className="ds-button-primary"
                disabled={!String(form.name || "").trim() || busy === "cam-new" || busy === `cam-${form.camera_id}`}
                onClick={async () => {
                  const ok = await onSave({
                    camera_id: form.camera_id,
                    name: String(form.name).trim(),
                    zone: form.zone,
                    vendor: form.vendor,
                    stream_url: form.stream_url,
                    external_ref: form.external_ref,
                    bay_id: form.bay_id === "" ? null : Number(form.bay_id),
                    enabled: !!form.enabled,
                  } as any);
                  if (ok) { setForm(empty); setOpen(false); }
                }}
              >
                {busy === "cam-new" || busy === `cam-${form.camera_id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save camera
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ds-card p-0 overflow-x-auto">
        {cameras.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-zinc-500">
            No cameras registered yet.
            <div className="mt-1 text-xs text-zinc-600">
              Registering a camera is for the operator's reference — alerts are accepted from any device holding the shared secret.
            </div>
          </div>
        ) : (
          <table className="ds-table">
            <thead>
              <tr>
                <th className="ds-th">Name</th>
                <th className="ds-th">Zone</th>
                <th className="ds-th">Vendor</th>
                <th className="ds-th">Device ref</th>
                <th className="ds-th">Bay</th>
                <th className="ds-th">Link</th>
                <th className="ds-th">State</th>
                <th className="ds-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cameras.map((c) => (
                <tr key={c.camera_id} className="ds-table-row">
                  <td className="ds-td font-bold text-zinc-100">{c.name || "—"}</td>
                  <td className="ds-td">{c.zone || "—"}</td>
                  <td className="ds-td">{c.vendor || "—"}</td>
                  <td className="ds-td font-mono text-[11px]">{c.external_ref || "—"}</td>
                  <td className="ds-td">{c.bay_id ?? "—"}</td>
                  <td className="ds-td">
                    {c.stream_url ? (
                      <a href={c.stream_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300">
                        <Link2 className="h-3 w-3" /> Open
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-500">none</span>
                    )}
                  </td>
                  <td className="ds-td">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${
                      isEnabled(c.enabled)
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}>
                      {isEnabled(c.enabled) ? "ENABLED" : "DISABLED"}
                    </span>
                  </td>
                  <td className="ds-td text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="ds-button-secondary h-7 px-2 text-[10px]"
                        onClick={() => {
                          setForm({
                            camera_id: c.camera_id, name: c.name || "", zone: c.zone || "", vendor: c.vendor || "",
                            stream_url: c.stream_url || "", external_ref: c.external_ref || "",
                            bay_id: c.bay_id ?? "", enabled: isEnabled(c.enabled),
                          });
                          setOpen(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="ds-button-secondary h-7 px-2 text-[10px] text-rose-300"
                        disabled={busy === `del-${c.camera_id}`}
                        onClick={() => onDelete(c)}
                      >
                        {busy === `del-${c.camera_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function BayViewTab({ bays, alertLabel }: { bays: BayRow[]; alertLabel: (t: string | null) => string }) {
  if (bays.length === 0) {
    return (
      <div className="ds-card py-12 text-center text-sm text-zinc-500">
        No active bays found, so there is nothing to map cameras against.
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {bays.map((b) => {
        const tone = severityTone(b.top_alert?.severity);
        return (
          <div key={b.bay_id} className={`ds-card ${b.open_alert_count > 0 ? "border-amber-500/40" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-black text-zinc-100 truncate">{b.bay_name || `Bay ${b.bay_id}`}</div>
                <div className="text-[10px] text-zinc-500">
                  {b.bay_code || "—"} · {b.status || "—"}
                </div>
              </div>
              {b.open_alert_count > 0 && (
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border ${tone.chip}`}>
                  {b.open_alert_count} OPEN
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Car className="h-3.5 w-3.5 text-zinc-500" />
                {b.current_job ? (
                  <span>
                    <span className="font-bold">{b.current_job.vrn}</span>{" "}
                    <span className="text-zinc-500">· {b.current_job.job_card_no} · {b.current_job.status}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">Bay empty</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Camera className="h-3.5 w-3.5 text-zinc-500" />
                {b.camera ? (
                  b.camera.stream_url ? (
                    <a href={b.camera.stream_url} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 font-bold">
                      {b.camera.name} ↗
                    </a>
                  ) : (
                    <span>{b.camera.name} <span className="text-zinc-500">(no link)</span></span>
                  )
                ) : (
                  <span className="text-zinc-500">No camera mapped</span>
                )}
              </div>
              {b.top_alert && (
                <div className="flex items-center gap-1.5 text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Latest: {alertLabel(b.top_alert.alert_type)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab({
  config, busy, webhookUrl, onSave,
}: {
  config: CctvConfig | null;
  busy: string | null;
  webhookUrl: string;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [key, setKey] = useState("");
  const [dedupe, setDedupe] = useState<string>("");

  useEffect(() => {
    setDedupe(config ? String(config.dedupe_seconds) : "");
  }, [config]);

  if (!config) {
    return <div className="ds-card py-12 text-center text-sm text-zinc-500">Settings unavailable.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="ds-card space-y-4">
        <h3 className="ds-subtitle flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-orange-500" /> Device connection
        </h3>
        <div>
          <label className="ds-label">Endpoint your camera / NVR / edge box must POST to</label>
          <code className="block w-full truncate rounded-xl border border-zinc-800 bg-black px-3 py-2 text-[11px] text-emerald-300">
            {webhookUrl}
          </code>
          <p className="mt-1 text-[10px] text-zinc-500">
            Header <code className="text-zinc-300">X-CCTV-Key: &lt;shared secret&gt;</code> is required. Body:{" "}
            <code className="text-zinc-300">
              {"{"} "alert_type", "camera_id", "zone", "description", "snapshot_url", "confidence", "detected_at" {"}"}
            </code>
          </p>
        </div>
        <div>
          <label className="ds-label">
            Shared secret {config.has_webhook_key ? <span className="text-emerald-400">· one is set</span> : <span className="text-rose-400">· NOT set — ingestion refuses everything</span>}
          </label>
          <div className="flex gap-2">
            <input
              className="ds-input"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={config.has_webhook_key ? "••••••••  (enter a new value to replace)" : "Choose a long random string"}
              autoComplete="new-password"
            />
            <button
              className="ds-button-primary shrink-0"
              disabled={!key.trim() || busy === "config"}
              onClick={() => { onSave({ webhook_key: key.trim() }); setKey(""); }}
            >
              {busy === "config" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Set
            </button>
          </div>
          <p className="mt-1 text-[10px] text-zinc-500">
            Stored in the database, not in a deployment env var — so setting it needs no redeploy and cannot risk the
            live DB/JWT secrets. It is never shown again once saved.
          </p>
        </div>
      </div>

      <div className="ds-card space-y-4">
        <h3 className="ds-subtitle">Ingestion behaviour</h3>
        <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-800/60">
          <div>
            <div className="ds-label mb-0">Accept detections</div>
            <p className="text-[10px] text-zinc-500">
              When off, the endpoint answers 503 and records nothing. Existing alerts are untouched.
            </p>
          </div>
          <button
            className={config.enabled ? "ds-button-success" : "ds-button-secondary"}
            disabled={busy === "config"}
            onClick={() => onSave({ enabled: !config.enabled })}
          >
            {config.enabled ? "ENABLED" : "DISABLED"}
          </button>
        </div>
        <div>
          <label className="ds-label">Duplicate suppression window (seconds)</label>
          <div className="flex gap-2">
            <input
              className="ds-input"
              type="number"
              min={0}
              value={dedupe}
              onChange={(e) => setDedupe(e.target.value)}
            />
            <button
              className="ds-button-primary shrink-0"
              disabled={busy === "config" || dedupe === String(config.dedupe_seconds)}
              onClick={() => onSave({ dedupe_seconds: Number(dedupe) })}
            >
              {busy === "config" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
          <p className="mt-1 text-[10px] text-zinc-500">
            The same camera reporting the same alert type inside this window collapses into one alert. 0 disables it —
            useful for debugging a device, noisy in production.
          </p>
        </div>
      </div>

      <div className="ds-card">
        <h3 className="ds-subtitle mb-3">Alert types this hub understands</h3>
        <div className="flex flex-wrap gap-2">
          {config.alert_types.map((t) => {
            const tone = severityTone(t.defaultSeverity);
            return (
              <span key={t.value} className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${tone.chip}`} title={`Default severity: ${t.defaultSeverity}`}>
                {t.label}
              </span>
            );
          })}
        </div>
        <p className="mt-3 text-[10px] text-zinc-500">
          An unrecognised <code>alert_type</code> is stored as <em>Custom</em> rather than rejected, so a vendor-specific
          detection is never silently dropped.
        </p>
      </div>
    </div>
  );
}
