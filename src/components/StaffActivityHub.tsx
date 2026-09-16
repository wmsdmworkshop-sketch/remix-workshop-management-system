import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  LogIn,
  CalendarCheck,
  Activity,
  AlertTriangle,
  X,
} from "lucide-react";
import { staffAuthHeaders, isSessionExpiredResponse, endExpiredSession, getStaffUserId } from "../lib/authToken";

/**
 * Staff Activity & Compliance — per-person sign-in, attendance and platform usage.
 *
 * VISIBILITY: admin / developer / gm_service, by the owner's instruction of
 * 2026-09-16. The tab is only registered for those roles in App.tsx, and the
 * server independently enforces the same three (`/api/admin/user-activity/*`).
 * The client-side role check is cosmetic; the server is the boundary.
 *
 * REAL DATA ONLY. Every number comes from a table row. The one that surprises
 * people is `last_login_at`: logins were never recorded before 2026-09-16, so
 * existing accounts show "Never recorded" until that person signs in once. That
 * is the honest state, and it is rendered as such rather than backfilled with a
 * guess.
 */

interface StaffRow {
  user_id: number;
  employee_id: number | null;
  full_name: string | null;
  username: string;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  logins_in_window: number;
  failed_logins_in_window: number;
  login_days_in_window: number;
  present_days_month: number;
  late_days_month: number;
  overtime_hours_month: number;
  last_punch_date: string | null;
  jc_actions_in_window: number;
  audit_actions_in_window: number;
  last_action_at: string | null;
  usage_score: number | null;
}

interface StaffResponse {
  success: boolean;
  window_days: number;
  working_days_elapsed: number;
  activity_target: number;
  rows: StaffRow[];
}

interface DetailResponse {
  success: boolean;
  window_days: number;
  working_days_elapsed: number;
  activity_target: number;
  user: {
    user_id: number;
    employee_id: number | null;
    full_name: string | null;
    username: string;
    email: string | null;
    role: string;
    is_active: boolean;
    account_created_at: string | null;
    must_change_password: boolean;
  };
  login_totals: { total: number; success: number; failed: number };
  recent_logins: Array<{ log_id: number; login_at: string; ip_address: string | null; status: string }>;
  attendance_summary: {
    present_days: number;
    late_days: number;
    overtime_hours: number;
    last_punch_date: string | null;
  };
  recent_punches: Array<{
    attendance_id: number;
    shift_date: string;
    check_in: string | null;
    check_out: string | null;
    shift_type: string | null;
    status: string | null;
    is_late: number | null;
    late_reason: string | null;
    is_overtime: number | null;
    overtime_hours: number | null;
  }>;
  recent_jc_actions: Array<{
    id: number;
    job_card_no: string | null;
    action_type: string;
    action_detail: string | null;
    actor_role: string | null;
    ip_address: string | null;
    created_at: string;
  }>;
  recent_audit_actions: Array<{ log_id: number; action: string; details: string | null; created_at: string }>;
  usage: {
    overall: number | null;
    components: Array<{ key: string; label: string; value: number | null }>;
    jc_actions_in_window: number;
    audit_actions_in_window: number;
  };
}

/**
 * The workshop works in IST, and the server runs on UTC.
 *
 * Timestamps now arrive from the API as explicitly-labelled UTC
 * ("2026-09-16T06:45:20Z"), so they parse to the true instant. They are then
 * rendered in the SITE's timezone explicitly rather than the viewer's machine —
 * a laptop in another region would otherwise silently show a different time for
 * the same event, which is exactly the kind of quiet disagreement this report
 * exists to settle.
 *
 * NOTE the shift columns are NOT instants and are deliberately left as-is:
 * `check_in` / `check_out` are the IST wall-clock recorded at the gate ("09:38")
 * and `shift_date` is a plain date. Converting either would corrupt them.
 */
const SITE_TIME_ZONE = "Asia/Kolkata";

/** Local site time, or an honest dash when the server sent null. */
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    timeZone: SITE_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "3 days ago" style relative age for the last sign-in column. */
function fmtAge(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-slate-900 border border-slate-800 rounded-xl ${className}`}>{children}</div>
);

const Pill: React.FC<{ tone: "ok" | "warn" | "bad" | "muted"; children: React.ReactNode }> = ({ tone, children }) => {
  const tones: Record<string, string> = {
    ok: "bg-emerald-500/15 text-emerald-400",
    warn: "bg-amber-500/15 text-amber-400",
    bad: "bg-red-500/15 text-red-400",
    muted: "bg-slate-800 text-slate-400",
  };
  return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${tones[tone]}`}>{children}</span>;
};

export default function StaffActivityHub() {
  // Who is looking at this page — used to explain their OWN empty row rather
  // than leaving a bare "Never recorded" that reads as "you have never used the
  // system".
  const myUserId = React.useMemo(() => getStaffUserId(), []);
  const [data, setData] = useState<StaffResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState("");
  const [onlyInactive, setOnlyInactive] = useState(false);

  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/user-activity/staff?days=${days}`, { headers: staffAuthHeaders() });
      if (isSessionExpiredResponse(res)) {
        endExpiredSession();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status}).`);
      }
      setData(await res.json());
    } catch (e: any) {
      // Keep the last good data on screen; surface the failure rather than
      // silently degrading to an empty table that reads like "no activity".
      setError(e?.message || "Failed to load staff activity.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(
    async (userId: number) => {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      try {
        const res = await fetch(`/api/admin/user-activity/${userId}?days=${days}`, { headers: staffAuthHeaders() });
        if (isSessionExpiredResponse(res)) {
          endExpiredSession();
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Request failed (${res.status}).`);
        }
        setDetail(await res.json());
      } catch (e: any) {
        setDetailError(e?.message || "Failed to load that person's activity.");
      } finally {
        setDetailLoading(false);
      }
    },
    [days]
  );

  const rows = useMemo(() => {
    const all = data?.rows || [];
    const q = search.trim().toLowerCase();
    return all
      .filter((r) => (onlyInactive ? !r.is_active : true))
      .filter(
        (r) =>
          !q ||
          String(r.full_name || "").toLowerCase().includes(q) ||
          r.username.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q)
      );
  }, [data, search, onlyInactive]);

  return (
    <div className="space-y-6 bg-[#0B1220] text-slate-100 min-h-screen p-4 md:p-6" lang="en">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Staff Activity</h1>
            <p className="text-[11px] text-slate-500">
              Sign-ins, attendance and platform usage — admin, developer and GM only.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-200 outline-none"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary strip — honest about how little history exists at first. */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-[10px] uppercase font-bold text-slate-500">Accounts</p>
            <p className="text-2xl font-black text-white">{data.rows.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase font-bold text-slate-500">Signed in ({data.window_days}d)</p>
            <p className="text-2xl font-black text-white">
              {data.rows.filter((r) => r.logins_in_window > 0).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase font-bold text-slate-500">Punched this month</p>
            <p className="text-2xl font-black text-white">
              {data.rows.filter((r) => r.present_days_month > 0).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-[10px] uppercase font-bold text-slate-500">Failed sign-ins ({data.window_days}d)</p>
            <p className="text-2xl font-black text-white">
              {data.rows.reduce((s, r) => s + r.failed_logins_in_window, 0)}
            </p>
          </Card>
        </div>
      )}

      {/* Shown while ANY account still has no recorded sign-in — not only when
          ALL of them do. The first version required every row to be empty, so the
          moment a few people signed in the explanation disappeared and the
          remaining rows read as bare "Never recorded", which looks like those
          people have never used the system. They are usually signed in RIGHT NOW:
          a session is a 24-hour JWT, so anyone who was already logged in when
          recording began keeps showing this until they next sign in. */}
      {data && data.rows.some((r) => !r.last_login_at) && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-200/90">
            Sign-ins are recorded from <strong>16 September 2026, 12:06 IST</strong> onward. The login-history
            table existed before that but nothing wrote to it, and past sign-ins cannot be recovered. Because a
            session is a <strong>24-hour token</strong>, anyone already signed in when this began — including
            you, if your row is empty — keeps showing <em>Never recorded</em> until they next sign out and back
            in. Attendance and activity figures cover the full period and are unaffected.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-red-200/90">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, username or role…"
            className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 outline-none w-72"
          />
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <input
            type="checkbox"
            checked={onlyInactive}
            onChange={(e) => setOnlyInactive(e.target.checked)}
            className="accent-emerald-500"
          />
          Deactivated accounts only
        </label>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-500 uppercase text-[10px] font-bold border-b border-slate-800">
              <th className="text-left p-3">Person</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Last sign-in</th>
              <th className="text-right p-3">Sign-ins</th>
              <th className="text-right p-3">Failed</th>
              <th className="text-right p-3">Punched (mo)</th>
              <th className="text-right p-3">Late</th>
              <th className="text-right p-3">Actions</th>
              <th className="text-right p-3">Usage</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={9} className="text-center text-slate-500 italic py-8">
                  Loading staff activity…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-slate-500 italic py-8">
                  No accounts match.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.user_id}
                  onClick={() => openDetail(r.user_id)}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-950/60 cursor-pointer"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{r.full_name || r.username}</span>
                      {r.user_id === myUserId && <Pill tone="ok">you</Pill>}
                      {!r.is_active && <Pill tone="muted">off</Pill>}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{r.username}</span>
                  </td>
                  <td className="p-3 text-slate-400">{r.role}</td>
                  <td className="p-3">
                    {r.last_login_at ? (
                      <div>
                        <div className="text-slate-300">{fmtDateTime(r.last_login_at)}</div>
                        <div className="text-[10px] text-slate-500">{fmtAge(r.last_login_at)}</div>
                      </div>
                    ) : r.user_id === myUserId ? (
                      <span
                        className="text-amber-300/90 italic text-[11px]"
                        title="Your session was issued before sign-in recording began. Sign out and back in to record one."
                      >
                        This session predates recording
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">Never recorded</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-200">{r.logins_in_window}</td>
                  <td className="p-3 text-right font-mono">
                    {r.failed_logins_in_window > 0 ? (
                      <span className="text-red-400">{r.failed_logins_in_window}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-200">
                    {r.present_days_month > 0 ? r.present_days_month : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {r.late_days_month > 0 ? (
                      <span className="text-amber-400">{r.late_days_month}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-mono text-slate-400">
                    {r.jc_actions_in_window + r.audit_actions_in_window}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {r.usage_score == null ? (
                      <span className="text-slate-500">—</span>
                    ) : (
                      <span
                        className={
                          r.usage_score >= 75
                            ? "text-emerald-400"
                            : r.usage_score >= 40
                            ? "text-amber-400"
                            : "text-red-400"
                        }
                      >
                        {r.usage_score}%
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* ── Drill-down ─────────────────────────────────────────────────────── */}
      {(detail || detailLoading || detailError) && (
        <Card className="p-4 space-y-4">
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                {detail?.user.full_name || detail?.user.username || "Activity detail"}
              </h2>
              {detail && <Pill tone={detail.user.is_active ? "ok" : "muted"}>{detail.user.is_active ? "active" : "off"}</Pill>}
            </div>
            <button
              onClick={() => {
                setDetail(null);
                setDetailError(null);
              }}
              className="text-slate-500 hover:text-slate-200"
              aria-label="Close detail"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {detailLoading && <p className="text-xs text-slate-500 italic">Loading…</p>}
          {detailError && <p className="text-xs text-red-300">{detailError}</p>}

          {detail && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Role</p>
                  <p className="text-sm text-slate-200">{detail.user.role}</p>
                </div>
                <div className="bg-slate-950/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500">
                    Sign-ins ({detail.window_days}d)
                  </p>
                  <p className="text-sm text-slate-200">
                    {detail.login_totals.success}
                    {detail.login_totals.failed > 0 && (
                      <span className="text-red-400"> · {detail.login_totals.failed} failed</span>
                    )}
                  </p>
                </div>
                <div className="bg-slate-950/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Punched this month</p>
                  <p className="text-sm text-slate-200">
                    {detail.attendance_summary.present_days} of {detail.working_days_elapsed} working days
                  </p>
                </div>
                <div className="bg-slate-950/60 rounded-lg p-3">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Usage score</p>
                  <p className="text-sm text-slate-200">
                    {detail.usage.overall == null ? "—" : `${detail.usage.overall}%`}
                  </p>
                </div>
              </div>

              {detail.user.employee_id == null && (
                <p className="text-[11px] text-amber-300/90">
                  No employee record is linked to this account, so attendance cannot be matched to it.
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sign-ins */}
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-2">
                    <LogIn className="h-3.5 w-3.5" /> Recent sign-ins
                  </h3>
                  {detail.recent_logins.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No sign-ins recorded yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {detail.recent_logins.map((l) => (
                        <div key={l.log_id} className="flex items-center justify-between text-[11px] border-b border-slate-800/50 py-1">
                          <span className="text-slate-300">{fmtDateTime(l.login_at)}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-slate-500 font-mono">{l.ip_address || "—"}</span>
                            <Pill tone={l.status === "success" ? "ok" : "bad"}>{l.status}</Pill>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attendance */}
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-2">
                    <CalendarCheck className="h-3.5 w-3.5" /> Attendance this month
                  </h3>
                  <p className="text-[10px] text-slate-500 mb-2">
                    Punch times are the wall-clock recorded at the gate (IST), not converted.
                  </p>
                  {detail.recent_punches.length === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No punches recorded this month.</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {detail.recent_punches.map((p) => (
                        <div key={p.attendance_id} className="flex items-center justify-between text-[11px] border-b border-slate-800/50 py-1">
                          <span className="text-slate-300">{p.shift_date}</span>
                          <span className="flex items-center gap-2 text-slate-400 font-mono">
                            {p.check_in || "—"} → {p.check_out || "—"}
                            {p.is_late === 1 && <Pill tone="warn">late</Pill>}
                            {p.is_overtime === 1 && <Pill tone="ok">OT</Pill>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div>
                  <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-400 mb-2">
                    <Activity className="h-3.5 w-3.5" /> Recent platform actions
                  </h3>
                  {(detail.recent_jc_actions.length + detail.recent_audit_actions.length) === 0 ? (
                    <p className="text-[11px] text-slate-500 italic">No actions recorded in this period.</p>
                  ) : (
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {detail.recent_jc_actions.map((a) => (
                        <div key={`jc-${a.id}`} className="text-[11px] border-b border-slate-800/50 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 font-mono">{a.job_card_no || "—"}</span>
                            <span className="text-slate-500">{fmtDateTime(a.created_at)}</span>
                          </div>
                          <span className="text-slate-400">{a.action_type}</span>
                        </div>
                      ))}
                      {detail.recent_audit_actions.map((a) => (
                        <div key={`au-${a.log_id}`} className="text-[11px] border-b border-slate-800/50 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">{a.action}</span>
                            <span className="text-slate-500">{fmtDateTime(a.created_at)}</span>
                          </div>
                          {a.details && <span className="text-slate-500">{a.details}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
                Usage score blends attendance ({detail.attendance_summary.present_days}/{detail.working_days_elapsed}{" "}
                working days) with platform activity ({detail.usage.jc_actions_in_window + detail.usage.audit_actions_in_window}{" "}
                actions against a target of {detail.activity_target}). It measures how much work flows{" "}
                <em>through the platform</em> — not how hard someone worked off it.
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
