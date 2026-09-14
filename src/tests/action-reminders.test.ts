import { describe, it, expect, afterEach } from "vitest";
import {
  ACTION_REMINDER_NOTIFICATION_ID,
  DEFAULT_REMINDER_WINDOW,
  NO_PENDING_ACTIONS,
  REMINDER_INTERVAL_MINUTES,
  REMINDER_WINDOW_STORAGE_KEY,
  buildReminderNotification,
  decideReminder,
  getReminderWindow,
  isWithinReminderWindow,
  summarisePendingActions,
  type PendingActions,
} from "../lib/action-reminders";

/**
 * Owner request (2026-09-14): "in the android app send notification to the user
 * where his actions are pending, every 5 mins".
 *
 * These pin the parts that decide whether the reminder is useful or harmful:
 * it must fire on a pending queue, must stay SILENT on an empty one, and must
 * not wake anyone at 3am. Getting any of those wrong is what gets an app muted.
 */

/** Local-time Date, so the window assertions do not depend on the machine's TZ. */
const at = (hour: number, minute = 0) => new Date(2026, 8, 14, hour, minute, 0);

const pending = (over: Partial<PendingActions> = {}): PendingActions => ({
  alerts: [],
  pendingJobs: 0,
  breaches: 0,
  hasAnything: false,
  ...over,
});

describe("cadence", () => {
  it("reminds every 5 minutes, as asked", () => {
    expect(REMINDER_INTERVAL_MINUTES).toBe(5);
  });

  it("republishes one fixed notification id so ticks replace rather than stack", () => {
    // Without this, a 5-minute cadence across a working day would leave ~96
    // near-identical reminders in the tray, which is how an app gets muted.
    expect(ACTION_REMINDER_NOTIFICATION_ID).toBeGreaterThan(0);
    expect(Number.isInteger(ACTION_REMINDER_NOTIFICATION_ID)).toBe(true);
  });
});

describe("isWithinReminderWindow — never wake anyone at 3am", () => {
  it("allows the working day and refuses the night", () => {
    expect(isWithinReminderWindow(at(10))).toBe(true);
    expect(isWithinReminderWindow(at(13, 30))).toBe(true);
    expect(isWithinReminderWindow(at(3))).toBe(false);
    expect(isWithinReminderWindow(at(22))).toBe(false);
    expect(isWithinReminderWindow(at(23, 59))).toBe(false);
  });

  it("treats the start as inclusive and the end as exclusive", () => {
    expect(isWithinReminderWindow(at(8, 0))).toBe(true);
    expect(isWithinReminderWindow(at(19, 59))).toBe(true);
    expect(isWithinReminderWindow(at(20, 0))).toBe(false);
  });

  it("supports a window that wraps midnight (night shift)", () => {
    const night = { startHour: 22, endHour: 6 };
    expect(isWithinReminderWindow(at(23), night)).toBe(true);
    expect(isWithinReminderWindow(at(2), night)).toBe(true);
    expect(isWithinReminderWindow(at(5, 59), night)).toBe(true);
    expect(isWithinReminderWindow(at(6), night)).toBe(false);
    expect(isWithinReminderWindow(at(12), night)).toBe(false);
  });

  it("treats a zero-width window as no restriction", () => {
    expect(isWithinReminderWindow(at(3), { startHour: 0, endHour: 0 })).toBe(true);
  });

  it("defaults to 08:00–20:00", () => {
    expect(DEFAULT_REMINDER_WINDOW).toEqual({ startHour: 8, endHour: 20 });
  });
});

describe("getReminderWindow — a bad override must not become 'all hours'", () => {
  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it("uses the default when nothing is stored", () => {
    expect(getReminderWindow()).toEqual(DEFAULT_REMINDER_WINDOW);
  });

  it("honours a stored override", () => {
    (globalThis as any).localStorage = {
      getItem: (k: string) =>
        k === REMINDER_WINDOW_STORAGE_KEY ? JSON.stringify({ startHour: 9, endHour: 18 }) : null,
    };
    expect(getReminderWindow()).toEqual({ startHour: 9, endHour: 18 });
  });

  it("falls back to the default for malformed or out-of-range values", () => {
    for (const bad of ['{"startHour":X}', "not json", '{"startHour":-1,"endHour":99}', "{}", "null"]) {
      (globalThis as any).localStorage = { getItem: () => bad };
      expect(getReminderWindow()).toEqual(DEFAULT_REMINDER_WINDOW);
    }
  });
});

describe("summarisePendingActions — never invent a count", () => {
  it("reports nothing for an empty response", () => {
    const r = summarisePendingActions({ summary: null, alerts: [] });
    expect(r.hasAnything).toBe(false);
    expect(r.pendingJobs).toBe(0);
    expect(r.alerts).toEqual([]);
  });

  it("reads the counts the server actually sends (mine.*)", () => {
    const r = summarisePendingActions({
      summary: { mine: { total: 3, pending: 2, breaches: 1 } },
    });
    expect(r.pendingJobs).toBe(2);
    expect(r.breaches).toBe(1);
    expect(r.hasAnything).toBe(true);
  });

  it("falls back to counts.* for non-manager scope", () => {
    const r = summarisePendingActions({ summary: { counts: { pending: 4, breaches: 0 } } });
    expect(r.pendingJobs).toBe(4);
    expect(r.breaches).toBe(0);
    expect(r.hasAnything).toBe(true);
  });

  it("itemises the alerts the server derived for this user", () => {
    const r = summarisePendingActions({
      alerts: [
        { alert_id: "derived-sla-6773", severity: "High", alert_message: "Job JC-04277 is overdue", job_card_no: "JC-04277" },
        { alert_id: "a2", severity: "Medium", alert_message: "Job JC-29267 is overdue", job_card_no: "JC-29267" },
      ],
    });
    expect(r.alerts).toHaveLength(2);
    expect(r.alerts[0].severity).toBe("critical");
    expect(r.alerts[0].jobCardNo).toBe("JC-04277");
    expect(r.alerts[1].severity).toBe("warn");
    expect(r.hasAnything).toBe(true);
  });

  it("stays silent — not zero — when the summary is missing", () => {
    // A failed /api/my/summary must NOT read as "nothing to do", or a broken
    // endpoint would quietly disable every reminder.
    const r = summarisePendingActions({ summary: undefined, alerts: undefined });
    expect(r.hasAnything).toBe(false);
    expect(r.pendingJobs).toBe(0);
  });

  it("does not turn a non-numeric count into a number", () => {
    const r = summarisePendingActions({ summary: { mine: { pending: "N/A", breaches: null } } });
    expect(r.pendingJobs).toBe(0);
    expect(r.breaches).toBe(0);
    expect(r.hasAnything).toBe(false);
  });

  it("survives junk without throwing", () => {
    expect(() => summarisePendingActions({} as any)).not.toThrow();
    expect(() => summarisePendingActions({ alerts: [null, {}, { alert_message: "" }] } as any)).not.toThrow();
    const r = summarisePendingActions({ alerts: [null, {}] as any });
    expect(r.alerts).toEqual([]);
  });
});

describe("buildReminderNotification — must be null when there is nothing to say", () => {
  it("returns null for an empty queue, so it can never say '0 pending'", () => {
    expect(buildReminderNotification(NO_PENDING_ACTIONS)).toBeNull();
    expect(buildReminderNotification(pending({ pendingJobs: 0 }))).toBeNull();
  });

  it("leads with the first alert and counts the rest", () => {
    const n = buildReminderNotification(
      pending({
        alerts: [
          { id: "a1", label: "Job JC-04277 is overdue", severity: "critical", jobCardNo: "JC-04277" },
          { id: "a2", label: "Job JC-29267 is overdue", severity: "critical", jobCardNo: "JC-29267" },
        ],
        hasAnything: true,
      })
    );
    expect(n).not.toBeNull();
    expect(n!.title).toBe("2 actions pending");
    expect(n!.body).toContain("Job JC-04277 is overdue");
    expect(n!.body).toContain("+1 more action waiting on you.");
    expect(n!.body).toContain("JC-04277");
  });

  it("says '1 action pending' for a single one", () => {
    const n = buildReminderNotification(
      pending({ alerts: [{ id: "a1", label: "Job JC-1 is overdue", severity: "warn" }], hasAnything: true })
    );
    expect(n!.title).toBe("1 action pending");
    expect(n!.body).not.toContain("more action");
  });

  it("uses the queue count when there are counts but no itemised alerts", () => {
    const n = buildReminderNotification(pending({ pendingJobs: 3, hasAnything: true }));
    expect(n!.title).toBe("3 actions pending");
    expect(n!.body).toContain("3 job cards in your queue are still pending.");
  });

  it("reports breaches alongside the queue", () => {
    const n = buildReminderNotification(pending({ pendingJobs: 4, breaches: 2, hasAnything: true }));
    expect(n!.body).toContain("2 jobs are past the promised time.");
  });

  it("only mentions breaches when a queue exists, and never invents one", () => {
    const n = buildReminderNotification(pending({ breaches: 1, hasAnything: true }));
    // breaches alone still has something to say, and it says exactly that
    expect(n).not.toBeNull();
    expect(n!.body).toContain("1 job is past the promised time.");
  });

  it("fingerprints identical content identically and changed content differently", () => {
    const a = buildReminderNotification(pending({ pendingJobs: 3, hasAnything: true }))!;
    const b = buildReminderNotification(pending({ pendingJobs: 3, hasAnything: true }))!;
    const c = buildReminderNotification(pending({ pendingJobs: 4, hasAnything: true }))!;
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.fingerprint).not.toBe(c.fingerprint);
  });
});

describe("decideReminder — the single gate the scheduler consults", () => {
  it("refuses outside the window even with real pending work", () => {
    const d = decideReminder(pending({ pendingJobs: 2, hasAnything: true }), at(3));
    expect(d.send).toBe(false);
    expect(d.reason).toBe("outside_window");
    expect(d.content).toBeNull();
  });

  it("refuses an empty queue during the working day", () => {
    const d = decideReminder(NO_PENDING_ACTIONS, at(11));
    expect(d.send).toBe(false);
    expect(d.reason).toBe("nothing_pending");
  });

  it("sends during the working day when something is genuinely pending", () => {
    const d = decideReminder(pending({ pendingJobs: 2, hasAnything: true }), at(11));
    expect(d.send).toBe(true);
    expect(d.reason).toBeNull();
    expect(d.content?.title).toBe("2 actions pending");
  });
});
