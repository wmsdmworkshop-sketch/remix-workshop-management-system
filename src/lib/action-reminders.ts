/**
 * PENDING-ACTION REMINDERS — when the Android app may interrupt someone about
 * work that is waiting on THEM.
 *
 * Pure logic only: no Capacitor, no fetch, no timers. The effectful half lives in
 * `action-reminder-scheduler.ts`, so everything below is testable without a device.
 *
 * ── Why this is not just "fire a notification every 5 minutes" ───────────────
 *
 * 1. A reminder must never fire when nothing is pending. A fixed-clock nudge that
 *    claims "you have work" against an empty queue is a fabricated statement about
 *    the user's workload (EAR-001), and it is the fastest way to teach people that
 *    the notification means nothing.
 * 2. The same text re-posting every 5 minutes is how an app gets muted. Each tick
 *    republishes ONE notification id, so the tray shows the current reminder rather
 *    than stacking 96 near-identical copies across a working day.
 * 3. Overnight reminders get notifications switched off entirely, which loses the
 *    reminders that matter. The default window is therefore 08:00–20:00 — see
 *    DEFAULT_REMINDER_WINDOW; changing it here changes the whole app.
 * 4. Counts come from the server's own per-user view. Nothing is recomputed or
 *    estimated here, and an unreadable field stays absent rather than becoming 0.
 */

/** How often the reminder is refreshed while the app is running. */
export const REMINDER_INTERVAL_MINUTES = 5;

/**
 * The one notification id every tick republishes.
 *
 * Android replaces an existing notification with the same id instead of adding a
 * second one, which is what keeps a 5-minute cadence from filling the tray.
 */
export const ACTION_REMINDER_NOTIFICATION_ID = 7104;

/** Android notification channel for action reminders. */
export const ACTION_REMINDER_CHANNEL_ID = "dwip-action-reminders";

/** Hours (local, inclusive start / exclusive end) during which reminders may fire. */
export interface ReminderWindow {
  startHour: number;
  endHour: number;
}

/**
 * 08:00–20:00. Sensible for a workshop whose bays run through the day. A reminder
 * at 03:00 does not get acted on; it gets the app muted.
 */
export const DEFAULT_REMINDER_WINDOW: ReminderWindow = { startHour: 8, endHour: 20 };

export type ReminderSeverity = "critical" | "warn" | "info";

export interface PendingAction {
  id: string;
  label: string;
  severity: ReminderSeverity;
  jobCardNo?: string | null;
  vrn?: string | null;
}

export interface PendingActions {
  /** Itemised alerts for this user — the concrete "your action is pending" list. */
  alerts: PendingAction[];
  /** Jobs in this user's own queue (the server's `mine.pending`). */
  pendingJobs: number;
  /** Jobs this user owns that are already past their promised time. */
  breaches: number;
  /** True when there is at least one real thing to tell them about. */
  hasAnything: boolean;
}

export const NO_PENDING_ACTIONS: PendingActions = {
  alerts: [],
  pendingJobs: 0,
  breaches: 0,
  hasAnything: false,
};

/** A finite, non-negative count, or null when the server did not supply one. */
function count(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function severityOf(raw: unknown): ReminderSeverity {
  const s = String(raw ?? "").toLowerCase();
  if (s === "critical" || s === "high") return "critical";
  if (s === "warning" || s === "warn" || s === "medium") return "warn";
  return "info";
}

/**
 * Collapse the two per-user endpoints into one truthful picture.
 *
 * `/api/my/summary` carries the counts (`mine.pending`, `mine.breaches`);
 * `/api/my/alerts` carries the itemised alerts the server derived for this user.
 *
 * Both are treated as possibly-missing: if summary fails we still report the
 * alerts, and vice versa. A field that is absent is reported as absent — never
 * as 0, which would read as "nothing to do" and silently suppress the reminder.
 */
export function summarisePendingActions(input: {
  summary?: any;
  alerts?: any[];
}): PendingActions {
  const alerts: PendingAction[] = (Array.isArray(input?.alerts) ? input.alerts : [])
    .filter((a) => a && (a.alert_message || a.title))
    .map((a, i) => ({
      id: String(a.alert_id ?? a.id ?? `alert-${i}`),
      label: String(a.alert_message || a.title || "").trim(),
      severity: severityOf(a.severity),
      jobCardNo: a.job_card_no ? String(a.job_card_no) : null,
      vrn: a.vrn ? String(a.vrn) : null,
    }));

  const summary = input?.summary ?? {};
  const pendingJobs =
    count(summary?.mine?.pending) ?? count(summary?.counts?.pending) ?? 0;
  const breaches =
    count(summary?.mine?.breaches) ?? count(summary?.counts?.breaches) ?? 0;

  return {
    alerts,
    pendingJobs,
    breaches,
    hasAnything: alerts.length > 0 || pendingJobs > 0 || breaches > 0,
  };
}

/** True when `now` is inside the reminder window. Supports windows that wrap midnight. */
export function isWithinReminderWindow(
  now: Date,
  window: ReminderWindow = DEFAULT_REMINDER_WINDOW
): boolean {
  const hour = now.getHours() + now.getMinutes() / 60;
  const { startHour, endHour } = window;
  if (startHour === endHour) return true; // 0-width window = no restriction
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  // Wraps midnight, e.g. 22:00–06:00.
  return hour >= startHour || hour < endHour;
}

/**
 * Device override for the reminder window, so a shift pattern can be adjusted on
 * a handset without shipping a build. Malformed or out-of-range values fall back
 * to the default rather than disabling the window — an unreadable setting must
 * never silently turn into "remind at any hour".
 */
export const REMINDER_WINDOW_STORAGE_KEY = "dwip_reminder_window";

export function getReminderWindow(): ReminderWindow {
  if (typeof localStorage === "undefined") return DEFAULT_REMINDER_WINDOW;
  try {
    const raw = localStorage.getItem(REMINDER_WINDOW_STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_WINDOW;
    const parsed = JSON.parse(raw);
    const startHour = Number(parsed?.startHour);
    const endHour = Number(parsed?.endHour);
    const whole = (n: number, hi: number) => Number.isInteger(n) && n >= 0 && n <= hi;
    if (!whole(startHour, 23) || !whole(endHour, 24)) return DEFAULT_REMINDER_WINDOW;
    return { startHour, endHour };
  } catch {
    return DEFAULT_REMINDER_WINDOW;
  }
}

export interface ReminderContent {
  title: string;
  body: string;
  /** Stable hash of the content, so a tick can tell whether anything changed. */
  fingerprint: string;
}

/** Short, stable, non-cryptographic hash — only used to compare two payloads. */
function fingerprintOf(parts: string[]): string {
  const s = parts.join("\u0001");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * The notification itself, or null when there is nothing to say.
 *
 * Returning null is the important case: it is how "nothing pending" prevents a
 * reminder rather than producing one that says 0.
 */
export function buildReminderNotification(pending: PendingActions): ReminderContent | null {
  if (!pending?.hasAnything) return null;

  const lead = pending.alerts[0];
  const parts: string[] = [];

  if (lead) {
    parts.push(lead.label);
    const extra = pending.alerts.length - 1;
    if (extra > 0) parts.push(`+${extra} more action${extra === 1 ? "" : "s"} waiting on you.`);
  } else if (pending.pendingJobs > 0) {
    parts.push(
      `${pending.pendingJobs} job card${pending.pendingJobs === 1 ? "" : "s"} in your queue ${pending.pendingJobs === 1 ? "is" : "are"} still pending.`
    );
  }

  if (pending.breaches > 0) {
    parts.push(
      `${pending.breaches} ${pending.breaches === 1 ? "job is" : "jobs are"} past the promised time.`
    );
  }

  // Counts in the title come from the server's own numbers; when only alerts are
  // known the title counts alerts and says so, rather than inventing a total.
  const titleCount = pending.alerts.length > 0 ? pending.alerts.length : pending.pendingJobs;
  const title = `${titleCount} action${titleCount === 1 ? "" : "s"} pending`;

  const jobRefs = pending.alerts
    .map((a) => a.jobCardNo)
    .filter(Boolean) as string[];
  const jobNote = jobRefs.length === 1 ? ` (${jobRefs[0]})` : jobRefs.length > 1 ? ` (${jobRefs[0]} +${jobRefs.length - 1})` : "";

  const body = parts.filter(Boolean).join(" ") + jobNote;

  return {
    title,
    body,
    fingerprint: fingerprintOf([title, body]),
  };
}

export type ReminderSkipReason = "outside_window" | "nothing_pending";

export interface ReminderDecision {
  send: boolean;
  reason: ReminderSkipReason | null;
  content: ReminderContent | null;
}

/**
 * The single gate the scheduler consults: may we remind this user right now, and
 * with what? Kept pure so the policy is testable without timers or a device.
 */
export function decideReminder(
  pending: PendingActions,
  now: Date,
  window: ReminderWindow = DEFAULT_REMINDER_WINDOW
): ReminderDecision {
  if (!isWithinReminderWindow(now, window)) {
    return { send: false, reason: "outside_window", content: null };
  }
  const content = buildReminderNotification(pending);
  if (!content) return { send: false, reason: "nothing_pending", content: null };
  return { send: true, reason: null, content };
}
