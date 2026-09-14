/**
 * ACTION-REMINDER SCHEDULER — the effectful half of pending-action reminders.
 * The policy (what counts as an action, when it may fire, what the text says)
 * lives in `action-reminders.ts`; this file only talks to the network and to the
 * native notification plugin.
 *
 * ── DELIVERY REALITY — read this before changing the interval ────────────────
 *
 * This runs on a JS timer inside the Capacitor WebView. It therefore fires while
 * the app is running and stops when Android suspends the WebView in the
 * background. Android's floor for periodic background work (WorkManager) is
 * 15 MINUTES, so a 5-minute cadence with the app CLOSED is not something a timer
 * can deliver at all. Genuinely closing that gap needs one of:
 *   - FCM server push (server decides, works with the app closed) — needs a
 *     Firebase project, `google-services.json`, a device-token table and a
 *     `@capacitor/push-notifications` build; or
 *   - a native foreground service, which works but shows a permanent
 *     "DWIP is running" notification.
 *
 * The Android app is also a remote-URL WebView shell (`capacitor.config.ts` →
 * `server.url`), so this file ships with the WEB deploy — but the plugin it calls
 * only exists in an APK that was built after the plugin was added. Every APK
 * distributed so far lacks it, which is why `isActionReminderSupported()` gates
 * everything and the unsupported path is an honest no-op rather than an error.
 */

import { Capacitor } from "@capacitor/core";
import { getStaffToken } from "./authToken";
import {
  ACTION_REMINDER_CHANNEL_ID,
  ACTION_REMINDER_NOTIFICATION_ID,
  REMINDER_INTERVAL_MINUTES,
  type PendingActions,
  decideReminder,
  getReminderWindow,
  NO_PENDING_ACTIONS,
  summarisePendingActions,
} from "./action-reminders";

type LocalNotificationsPlugin =
  typeof import("@capacitor/local-notifications").LocalNotifications;

let pluginPromise: Promise<LocalNotificationsPlugin | null> | null = null;

/** Load the plugin lazily so the plain-web build never hard-depends on it. */
function loadPlugin(): Promise<LocalNotificationsPlugin | null> {
  if (!pluginPromise) {
    pluginPromise = import("@capacitor/local-notifications")
      .then((m) => m.LocalNotifications)
      .catch(() => null);
  }
  return pluginPromise;
}

/**
 * True only inside a native shell that actually contains the plugin. On the web,
 * and in any APK built before the plugin was added, this is false and every
 * reminder path degrades to a no-op.
 */
export function isActionReminderSupported(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("LocalNotifications");
  } catch {
    return false;
  }
}

/**
 * Android 13+ requires POST_NOTIFICATIONS at runtime. Reported honestly: if the
 * user refuses, we return false and the caller must not pretend to be scheduling
 * reminders.
 */
export async function ensureActionReminderPermission(): Promise<boolean> {
  const pl = await loadPlugin();
  if (!pl) return false;
  try {
    const current = await pl.checkPermissions();
    if (current.display === "granted") return true;
    const requested = await pl.requestPermissions();
    return requested.display === "granted";
  } catch {
    return false;
  }
}

/** Android 8+ needs an explicit channel or the notification is dropped silently. */
async function ensureChannel(pl: LocalNotificationsPlugin): Promise<void> {
  try {
    await pl.createChannel({
      id: ACTION_REMINDER_CHANNEL_ID,
      name: "Pending actions",
      description: "Reminders about work waiting on you in DWIP",
      importance: 4,
      visibility: 1,
    });
  } catch {
    // Channel creation is idempotent-and-harmless; a failure here must not stop
    // the reminder, because on Android < 8 there are no channels at all.
  }
}

/**
 * This user's pending work, from the two per-user endpoints.
 *
 * `/api/my/summary` gives the counts, `/api/my/alerts` the itemised alerts. Each
 * is fetched independently so one failing endpoint degrades that half instead of
 * losing the reminder entirely — and a failed fetch yields NO pending actions
 * rather than an invented count, which means it stays silent instead of lying.
 */
export async function fetchPendingActions(): Promise<PendingActions> {
  const token = getStaffToken();
  if (!token) return NO_PENDING_ACTIONS;

  const headers = { Authorization: `Bearer ${token}` };
  const [summary, alerts] = await Promise.all([
    fetch("/api/my/summary", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
    fetch("/api/my/alerts", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null),
  ]);

  return summarisePendingActions({
    summary,
    alerts: Array.isArray(alerts?.alerts) ? alerts.alerts : [],
  });
}

/**
 * Remove the standing reminder. Called whenever nothing is pending, so a reminder
 * cannot outlive the work it described — a tray still saying "3 actions pending"
 * after the queue was cleared is exactly the kind of stale claim this codebase
 * refuses to show anywhere else.
 */
export async function clearActionReminder(): Promise<void> {
  const pl = await loadPlugin();
  if (!pl) return;
  try {
    await pl.cancel({ notifications: [{ id: ACTION_REMINDER_NOTIFICATION_ID }] });
  } catch {
    /* nothing scheduled — nothing to do */
  }
}

export type ActionReminderTickResult =
  | { sent: true; fingerprint: string; title: string; body: string }
  | {
      sent: false;
      reason: "unsupported" | "no_permission" | "outside_window" | "nothing_pending";
    };

/**
 * One reminder evaluation. Safe to call as often as you like: it is the policy in
 * `decideReminder` that decides whether anything is published.
 */
export async function runActionReminderTick(
  now: Date = new Date()
): Promise<ActionReminderTickResult> {
  if (!isActionReminderSupported()) return { sent: false, reason: "unsupported" };

  const pl = await loadPlugin();
  if (!pl) return { sent: false, reason: "unsupported" };

  if (!(await ensureActionReminderPermission())) {
    return { sent: false, reason: "no_permission" };
  }

  const pending = await fetchPendingActions();
  const decision = decideReminder(pending, now, getReminderWindow());

  if (!decision.send || !decision.content) {
    // Nothing to say: make sure a previously-published reminder is withdrawn.
    if (decision.reason === "nothing_pending") await clearActionReminder();
    return { sent: false, reason: decision.reason ?? "nothing_pending" };
  }

  await ensureChannel(pl);
  await pl.schedule({
    notifications: [
      {
        // Fixed id: each tick REPLACES the previous reminder instead of stacking
        // a new one, which is what makes a 5-minute cadence bearable. See
        // ACTION_REMINDER_NOTIFICATION_ID.
        id: ACTION_REMINDER_NOTIFICATION_ID,
        title: decision.content.title,
        body: decision.content.body,
        channelId: ACTION_REMINDER_CHANNEL_ID,
        autoCancel: true,
        // Tapping opens the screen where the pending work actually lives.
        extra: { tab: "my-workspace" },
      },
    ],
  });

  return {
    sent: true,
    fingerprint: decision.content.fingerprint,
    title: decision.content.title,
    body: decision.content.body,
  };
}

let stopScheduler: (() => void) | null = null;

/**
 * Start reminding every REMINDER_INTERVAL_MINUTES while the app is running.
 * Idempotent: calling it twice does not create a second timer.
 * Returns a stop function.
 */
export function startActionReminderScheduler(): () => void {
  if (typeof window === "undefined") return () => {};
  // No-op on web and on APKs that predate the plugin — say nothing rather than
  // silently pretending reminders are scheduled.
  if (!isActionReminderSupported()) return () => {};
  if (stopScheduler) return stopScheduler;

  let stopped = false;
  const tick = () => {
    if (stopped) return;
    void runActionReminderTick().catch(() => {
      /* a failed tick must never surface as an app error */
    });
  };

  // Wait before the first reminder: the app is still hydrating, and a reminder
  // computed during load can describe a queue the user is already looking at.
  const initial = window.setTimeout(tick, 60_000);
  const every = window.setInterval(tick, REMINDER_INTERVAL_MINUTES * 60_000);

  // Returning to the app is exactly when a stale reminder misleads most, so
  // re-evaluate at once rather than waiting out the interval.
  const onVisibility = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const stop = () => {
    stopped = true;
    window.clearTimeout(initial);
    window.clearInterval(every);
    document.removeEventListener("visibilitychange", onVisibility);
    stopScheduler = null;
  };
  stopScheduler = stop;
  return stop;
}

/**
 * Wire up tapping a reminder: open the vehicle list where the pending work is.
 * Registered once; harmless if the app is not native.
 */
export function registerActionReminderTapHandler(): void {
  if (!isActionReminderSupported()) return;
  void loadPlugin().then((pl) => {
    if (!pl) return;
    void pl
      .addListener("localNotificationActionPerformed", (event: any) => {
        const tab = event?.notification?.extra?.tab;
        if (tab && typeof window !== "undefined") {
          window.location.assign(`/${tab}`);
        }
      })
      .catch(() => {
        /* listener registration is best-effort */
      });
  });
}
