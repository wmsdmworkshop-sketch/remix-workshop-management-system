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
 * Working days elapsed so far this month, Sundays excluded — the SAME basis the
 * My Workspace attendance component uses, so a person's attendance figure does
 * not differ between the two screens.
 */
function workingDaysElapsed(): number {
  const now = new Date();
  let n = 0;
  for (let d = 1; d <= now.getDate(); d++) {
    if (new Date(now.getFullYear(), now.getMonth(), d).getDay() !== 0) n++;
  }
  return n;
}

/** First day of the current month, as a shift_date-comparable string. */
function monthStart(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${m}-01`;
}

/** `YYYY-MM-DD HH:mm:ss` for a lookback window, matching MySQL datetime literals. */
function windowStart(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
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
          last_login_at: last ? last.last_login_at : null, // null = never recorded
          logins_in_window: Number(lg.ok || 0),
          failed_logins_in_window: Number(lg.failed || 0),
          login_days_in_window: Number(lg.login_days || 0),
          present_days_month: presentDays,
          late_days_month: Number(at.late_days || 0),
          overtime_hours_month: Number(at.overtime_hours || 0),
          last_punch_date: at.last_punch_date || null,
          jc_actions_in_window: jcN,
          audit_actions_in_window: auN,
          last_action_at: jc.last_at || au.last_at || null,
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
        recent_logins: logins || [],
        attendance_summary: {
          present_days: presentDays,
          late_days: Number(at.late_days || 0),
          overtime_hours: Number(at.overtime_hours || 0),
          last_punch_date: at.last_punch_date || null,
        },
        recent_punches: punches || [],
        recent_jc_actions: jcLog || [],
        recent_audit_actions: auditLog || [],
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
