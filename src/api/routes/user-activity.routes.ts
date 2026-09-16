/**
 * =============================================================================
 * DWIP Enterprise — Staff Activity & Compliance reporting
 *
 * Answers, for one person or the whole roster: when did they last sign in, are
 * they signing in at all, are they punching attendance, and how much of their
 * work actually flows through the platform.
 *
 * ── WHY THIS IS A FACTORY, NOT A BARE `Router` ──
 *
 * `authenticateToken` and `requireRoles` are consts INSIDE the async bootstrap
 * closure in server.ts and are never exported. Re-implementing them here would
 * fork the RBAC check, so they are injected — exactly the pattern established by
 * src/api/routes/ai.routes.ts.
 *
 * ── VISIBILITY (owner instruction, 2026-09-16) ──
 *
 * "this to be showing only to the developer and gm service and hr/admin".
 * There is no `hr` role in the `roles` table (verified), and the HR account
 * `hr_dapl` (user 29) carries `admin`. So the three roles below are the whole
 * intended audience: admin, developer, gm_service. This is personal
 * performance data about named employees, which is why it is deliberately NOT
 * widened to workshop_manager or floor_supervisor.
 *
 * ── REAL DATA ONLY (EAR-001) ──
 *
 * Every figure is a count or a timestamp read from a table. Where a signal does
 * not exist the field is `null` and the UI renders an honest empty state —
 * notably `last_login_at`, which is null for every account until that person
 * signs in once now that logins are recorded. `login_history` was empty and
 * unwritten before this feature; it is NOT backfilled, because inventing past
 * sign-ins would be fabrication. Expect "Never recorded" for a while, which is
 * the truth.
 * =============================================================================
 */

import { Router, type RequestHandler } from "express";
import { pool } from "../../db/index.ts";

export interface UserActivityRouterDependencies {
  authenticateToken: RequestHandler;
  /** Matches normalised role names (lowercase, space ≡ underscore). */
  requireRoles: (allowedRoles: string[]) => RequestHandler;
}

/** Owner instruction 2026-09-16: developer, gm_service, and HR (the admin account). */
const USER_ACTIVITY_ROLES = ["admin", "developer", "gm_service"];

/**
 * Actions in the platform audit trail that count toward a light "engaged" target.
 * Same target the My Workspace compliance card uses, kept identical so the two
 * screens cannot describe the same person differently.
 */
const ACTIVITY_TARGET = 20;

/** Clamp the lookback window so a hand-edited URL cannot scan the whole table. */
function resolveDays(raw: unknown): number {
  const n = parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(n, 365);
}

const clampPct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/**
 * Label a genuine UTC instant so the browser stops guessing.
 *
 * The stack is UTC end to end — Cloud SQL reports @@system_time_zone = UTC with
 * NOW() == UTC_TIMESTAMP(), and the container is UTC. But src/db/index.ts sets
 * `dateStrings: true`, so MySQL returns DATETIME/TIMESTAMP as
 * "2026-09-16 06:45:20" with NO timezone marker, and JavaScript parses a bare
 * string like that as LOCAL time. Measured live: a viewer in Asia/Kolkata
 * (UTC+05:30) saw every timestamp 5h30m EARLY — a sign-in that really happened at
 * 12:15 IST displayed as 06:45. Appending the Z makes the instant unambiguous.
 *
 * ── APPLIED PER FIELD, DELIBERATELY — NOT A BLANKET RULE ──
 * Some datetime columns in this schema hold LOCAL WALL-CLOCK, not instants, and
 * they live in the SAME table as UTC ones. job_card_master is the proof:
 * `created_at`/`updated_at` span hours 0-6 (UTC instants — 09:30-15:30 IST),
 * while `crm_arrival_at`/`crm_jc_started_at`/`crm_jc_completed_at` hold business
 * hours (10:00, 11:15, 15:15, 17:30) because /api/job-cards/:no/crm-timestamps
 * parses the literal CRM digits specifically to avoid Date() re-interpreting
 * them. A blanket "any YYYY-MM-DD HH:mm:ss is UTC" rule would shift those
 * wall-clock values by +5h30m and BREAK something that reads correctly today.
 * So each field below is classified on purpose. Everything this router returns
 * from `login_history.login_at`, `jc_activity_log.created_at` and
 * `security_audit_logs.created_at` is written by NOW()/CURRENT_TIMESTAMP, so all
 * three are genuine instants.
 *
 * NOT converted, and must never be: `shift_date` (a date), `check_in` /
 * `check_out` (the IST wall-clock punched at the gate).
 */
function asUtcInstant(v: string | null | undefined): string | null {
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? v.replace(" ", "T") + "Z" : v;
}

/**
 * The workshop's timezone. Everyone at this site works in IST, and the server
 * clock is UTC — so "today", "this month" and "working days elapsed" must be
 * computed from the SITE's calendar, not the server's. Using the server clock
 * makes the report disagree with the shop floor for the first 5h30m of every day
 * (and for the first 5h30m of every month, for the month boundary).
 */
const SITE_TIME_ZONE = "Asia/Kolkata";
const SITE_OFFSET_MINUTES = 330;

/**
 * "Now" as the site sees it. Returns a Date whose UTC fields ARE the IST
 * wall-clock fields, so read it with getUTC* (see the two helpers below).
 */
function siteNow(): Date {
  return new Date(Date.now() + SITE_OFFSET_MINUTES * 60 * 1000);
}

/**
 * Working days elapsed so far this month, Sundays excluded — the SAME basis the
 * My Workspace attendance component uses, so a person's attendance figure does
 * not differ between the two screens.
 */
function workingDaysElapsed(): number {
  const now = siteNow();
  let n = 0;
  for (let d = 1; d <= now.getUTCDate(); d++) {
    if (new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), d)).getUTCDay() !== 0) n++;
  }
  return n;
}

/** First day of the current month IN SITE TIME, as a shift_date-comparable string. */
function monthStart(): string {
  const now = siteNow();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${m}-01`;
}

/**
 * `YYYY-MM-DD HH:mm:ss` for a lookback window.
 *
 * Deliberately UTC, NOT site time: this value is compared against DATETIME
 * columns that store UTC, so it must be expressed in the same frame. Only the
 * calendar maths above needs the site's timezone.
 */
function windowStart(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

type Row = Record<string, any>;

/** Index rows by a key field so per-user merges are O(1). */
function byKey(rows: Row[], key: string, value: string | number): Map<string, Row> {
  const map = new Map<string, Row>();
  for (const r of rows) {
    const k = r[key];
    if (k != null) map.set(String(k), r);
  }
  return map;
}

export function createUserActivityRouter(deps: UserActivityRouterDependencies): Router {
  const { authenticateToken, requireRoles } = deps;
  const router = Router();
  const gate = [authenticateToken, requireRoles(USER_ACTIVITY_ROLES)];

  /**
   * GET /api/admin/user-activity/staff?days=30
   *
   * The roster view: one row per account, with the summary the owner asked for.
   *
   * Deliberately assembled from five small grouped queries and merged in JS
   * rather than one wide LEFT JOIN. The four sources are keyed differently —
   * attendance keys on `employee_id`, the two action logs key on the acting user
   * while `login_history` keys on the account — so a single join would multiply
   * rows against itself and produce counts that look plausible and are wrong.
   */
  router.get("/admin/user-activity/staff", ...gate, async (req: any, res: any) => {
    const days = resolveDays(req.query.days);
    const since = windowStart(days);
    const mStart = monthStart();

    try {
      const [staff] = await pool.query(
        `SELECT user_id, employee_id, full_name, username, user_role, is_active
           FROM user_access_master
          ORDER BY full_name, username`
      ) as any[];

      // Last sign-in overall — NOT limited to the window, so a dormant account
      // still shows the truth ("last seen 40 days ago") rather than "never".
      const [lastLogins] = await pool.query(
        `SELECT user_id, MAX(login_at) AS last_login_at
           FROM login_history GROUP BY user_id`
      ) as any[];

      // Sign-in counts inside the window, split success/failure.
      const [loginCounts] = await pool.query(
        `SELECT user_id,
                SUM(status = 'success') AS ok,
                SUM(status = 'failed')  AS failed,
                COUNT(DISTINCT DATE(login_at)) AS login_days
           FROM login_history
          WHERE login_at >= ?
          GROUP BY user_id`,
        [since]
      ) as any[];

      // Attendance is keyed on employee_id. Explicit column list: the table also
      // carries two LONGTEXT base64 face photos, and `SELECT *` here would pull
      // hundreds of KB per row (the same trap that made /api/employees hang).
      const [attendance] = await pool.query(
        `SELECT employee_id,
                COUNT(*) AS present_days,
                SUM(is_late = 1) AS late_days,
                MAX(is_overtime = 1) AS has_overtime,
                COALESCE(SUM(overtime_hours), 0) AS overtime_hours,
                MAX(shift_date) AS last_punch_date
           FROM workforce_attendance
          WHERE shift_date >= ?
          GROUP BY employee_id`,
        [mStart]
      ) as any[];

      // Work actually driven through the platform, per actor.
      const [jcActions] = await pool.query(
        `SELECT actor_user_id AS uid,
                COUNT(*) AS n,
                COUNT(DISTINCT DATE(created_at)) AS active_days,
                MAX(created_at) AS last_at
           FROM jc_activity_log
          WHERE created_at >= ?
          GROUP BY actor_user_id`,
        [since]
      ) as any[];

      const [auditActions] = await pool.query(
        `SELECT user_id AS uid,
                COUNT(*) AS n,
                COUNT(DISTINCT DATE(created_at)) AS active_days,
                MAX(created_at) AS last_at
           FROM security_audit_logs
          WHERE created_at >= ?
          GROUP BY user_id`,
        [since]
      ) as any[];

      const lastByUser = byKey(lastLogins, "user_id", 0);
      const loginsByUser = byKey(loginCounts, "user_id", 0);
      const attByEmp = byKey(attendance, "employee_id", 0);
      const jcByUser = byKey(jcActions, "uid", 0);
      const auditByUser = byKey(auditActions, "uid", 0);

      const wd = workingDaysElapsed();

      const rows = (staff || []).map((s: Row) => {
        const lg = loginsByUser.get(String(s.user_id)) || {};
        const at = attByEmp.get(String(s.employee_id)) || {};
        const jc = jcByUser.get(String(s.user_id)) || {};
        const au = auditByUser.get(String(s.user_id)) || {};
        const last = lastByUser.get(String(s.user_id));

        const presentDays = Number(at.present_days || 0);
        const jcN = Number(jc.n || 0);
        const auN = Number(au.n || 0);

        // Platform-usage blend, on the two components that are genuinely
        // per-person and DB-backed. The job-card components of the My Workspace
        // card (on-time handling, workflow completeness) are NOT reproduced here
        // because they derive from the in-memory job cache, which this router
        // does not hold — computing them differently would let the two screens
        // disagree about the same person.
        const attendancePct = wd > 0 ? clampPct(Math.min(presentDays / wd, 1) * 100) : null;
        const activityPct = clampPct(Math.min((jcN + auN) / ACTIVITY_TARGET, 1) * 100);
        const parts = [attendancePct, activityPct].filter((v) => v != null) as number[];

        return {
          user_id: s.user_id,
          employee_id: s.employee_id,
          full_name: s.full_name,
          username: s.username,
          role: s.user_role,
          is_active: s.is_active === 1 || s.is_active === true || s.is_active === "1",
          last_login_at: last ? asUtcInstant(last.last_login_at) : null, // null = never recorded
          logins_in_window: Number(lg.ok || 0),
          failed_logins_in_window: Number(lg.failed || 0),
          login_days_in_window: Number(lg.login_days || 0),
          present_days_month: presentDays,
          late_days_month: Number(at.late_days || 0),
          overtime_hours_month: Number(at.overtime_hours || 0),
          last_punch_date: at.last_punch_date || null,
          jc_actions_in_window: jcN,
          audit_actions_in_window: auN,
          last_action_at: asUtcInstant(jc.last_at || au.last_at || null),
          usage_score: parts.length ? clampPct(parts.reduce((a, b) => a + b, 0) / parts.length) : null,
        };
      });

      res.json({
        success: true,
        window_days: days,
        window_start: since,
        month_start: mStart,
        working_days_elapsed: wd,
        activity_target: ACTIVITY_TARGET,
        rows,
      });
    } catch (err: any) {
      console.error("[USER-ACTIVITY] staff list failed:", err.message);
      res.status(500).json({ error: "Failed to load staff activity." });
    }
  });

  /**
   * GET /api/admin/user-activity/:userId?days=30
   *
   * The drill-down: identity, recent sign-ins, recent attendance punches, and
   * recent actions — the audit trail behind the summary numbers.
   */
  router.get("/admin/user-activity/:userId", ...gate, async (req: any, res: any) => {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "A valid userId is required." });
    }
    const days = resolveDays(req.query.days);
    const since = windowStart(days);
    const mStart = monthStart();

    try {
      const [who] = await pool.query(
        `SELECT user_id, employee_id, full_name, username, email, user_role,
                is_active, created_at, must_change_password
           FROM user_access_master WHERE user_id = ?`,
        [userId]
      ) as any[];

      if (!who || who.length === 0) {
        return res.status(404).json({ error: "No such user account." });
      }
      const me = who[0];

      const [logins] = await pool.query(
        `SELECT log_id, login_at, ip_address, status
           FROM login_history
          WHERE user_id = ?
          ORDER BY login_at DESC
          LIMIT 25`,
        [userId]
      ) as any[];

      const [loginTotals] = await pool.query(
        `SELECT COUNT(*) AS total,
                SUM(status = 'success') AS ok,
                SUM(status = 'failed')  AS failed
           FROM login_history
          WHERE user_id = ? AND login_at >= ?`,
        [userId, since]
      ) as any[];

      // Attendance punches. EXPLICIT columns — face_photo_in / face_photo_out are
      // LONGTEXT base64 images and must never be selected here; not only for
      // payload size, but because a performance report is not the place to
      // surface an employee's biometric capture.
      const [punches] = await pool.query(
        `SELECT attendance_id, shift_date, check_in, check_out, shift_type, status,
                is_late, late_reason, is_overtime, overtime_hours
           FROM workforce_attendance
          WHERE employee_id = ?
            AND shift_date >= ?
          ORDER BY shift_date DESC
          LIMIT 25`,
        [me.employee_id ?? -1, mStart]
      ) as any[];

      const [attendanceSummary] = await pool.query(
        `SELECT COUNT(*) AS present_days,
                SUM(is_late = 1) AS late_days,
                COALESCE(SUM(overtime_hours), 0) AS overtime_hours,
                MAX(shift_date) AS last_punch_date
           FROM workforce_attendance
          WHERE employee_id = ? AND shift_date >= ?`,
        [me.employee_id ?? -1, mStart]
      ) as any[];

      const [jcLog] = await pool.query(
        `SELECT id, job_card_no, action_type, action_detail, actor_role, ip_address, created_at
           FROM jc_activity_log
          WHERE actor_user_id = ?
          ORDER BY created_at DESC
          LIMIT 25`,
        [userId]
      ) as any[];

      const [auditLog] = await pool.query(
        `SELECT log_id, action, details, created_at
           FROM security_audit_logs
          WHERE user_id = ?
          ORDER BY created_at DESC
          LIMIT 25`,
        [userId]
      ) as any[];

      const [jcCount] = await pool.query(
        `SELECT COUNT(*) AS n FROM jc_activity_log WHERE actor_user_id = ? AND created_at >= ?`,
        [userId, since]
      ) as any[];

      const [auditCount] = await pool.query(
        `SELECT COUNT(*) AS n FROM security_audit_logs WHERE user_id = ? AND created_at >= ?`,
        [userId, since]
      ) as any[];

      const wd = workingDaysElapsed();
      const at = (attendanceSummary || [])[0] || {};
      const presentDays = Number(at.present_days || 0);
      const jcN = Number((jcCount || [])[0]?.n || 0);
      const auN = Number((auditCount || [])[0]?.n || 0);

      const attendancePct = wd > 0 ? clampPct(Math.min(presentDays / wd, 1) * 100) : null;
      const activityPct = clampPct(Math.min((jcN + auN) / ACTIVITY_TARGET, 1) * 100);
      const measured = [attendancePct, activityPct].filter((v) => v != null) as number[];

      res.json({
        success: true,
        window_days: days,
        month_start: mStart,
        working_days_elapsed: wd,
        activity_target: ACTIVITY_TARGET,
        user: {
          user_id: me.user_id,
          employee_id: me.employee_id,
          full_name: me.full_name,
          username: me.username,
          email: me.email,
          role: me.user_role,
          is_active: me.is_active === 1 || me.is_active === true || me.is_active === "1",
          account_created_at: me.created_at,
          must_change_password: me.must_change_password === 1 || me.must_change_password === true,
        },
        login_totals: {
          total: Number((loginTotals || [])[0]?.total || 0),
          success: Number((loginTotals || [])[0]?.ok || 0),
          failed: Number((loginTotals || [])[0]?.failed || 0),
        },
        recent_logins: (logins || []).map((l: Row) => ({ ...l, login_at: asUtcInstant(l.login_at) })),
        attendance_summary: {
          present_days: presentDays,
          late_days: Number(at.late_days || 0),
          overtime_hours: Number(at.overtime_hours || 0),
          last_punch_date: at.last_punch_date || null,
        },
        recent_punches: punches || [],
        recent_jc_actions: (jcLog || []).map((a: Row) => ({ ...a, created_at: asUtcInstant(a.created_at) })),
        recent_audit_actions: (auditLog || []).map((a: Row) => ({ ...a, created_at: asUtcInstant(a.created_at) })),
        usage: {
          overall: measured.length ? clampPct(measured.reduce((a, b) => a + b, 0) / measured.length) : null,
          components: [
            { key: "attendance", label: "Attendance", value: attendancePct },
            { key: "activity", label: "Platform activity", value: activityPct },
          ],
          jc_actions_in_window: jcN,
          audit_actions_in_window: auN,
        },
      });
    } catch (err: any) {
      console.error("[USER-ACTIVITY] detail failed:", err.message);
      res.status(500).json({ error: "Failed to load activity for that user." });
    }
  });

  return router;
}

export default createUserActivityRouter;
