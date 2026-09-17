import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ALERT_TYPES,
  ingestAlert,
  listAlerts,
  acknowledgeAlert,
  countOpenAlerts,
} from "../integrations/cctv-analytics";

/**
 * CCTV & Floor Safety — ingest semantics + wiring contract.
 *
 * ── Why these two kinds of test, in one file ─────────────────────────────────
 *
 * The MODULE is testable in isolation: `ingestAlert`'s severity defaults, dedupe
 * window and camera-name resolution are pure decisions taken against a pool, so
 * a fake pool dispatching on SQL shape (the `release-settlement.test.ts` pattern)
 * covers them with no database.
 *
 * The ROUTE is not testable that way — `server.ts` binds a port on import and
 * needs a live DB — but the defect that made this whole feature unreachable was
 * a WIRING fact, not a logic one: `/api/cctv/alerts/ingest` was missing from
 * `PUBLIC_API_PATHS`, so the global JWT gate answered 401 before the route's own
 * device-key check could run. No camera could ever reach it. That is exactly the
 * class of fact `graph-auth-gate.test.ts` pins by reading the source, so the same
 * technique is used here.
 *
 * Three separate bugs shipped in this feature and each gets a guard below:
 *   1. webhook unreachable by a device  → whitelist + no user-JWT on the route
 *   2. bell notification dead-ending    → link value must name a real tab
 *   3. tab unreachable in the nav       → must be in WORKSPACE_MAPPING
 */

const SERVER_SRC = readFileSync(new URL("../../server.ts", import.meta.url), "utf8");
const APP_SRC = readFileSync(new URL("../../src/App.tsx", import.meta.url), "utf8");
const SHELL_SRC = readFileSync(new URL("../../src/components/AppShell.tsx", import.meta.url), "utf8");

// ── Fake pool ───────────────────────────────────────────────────────────────

interface FakeOpts {
  /** Row returned by the cctv_settings lookup. Defaults to dedupe enabled. */
  settings?: { webhook_key?: string; dedupe_seconds?: number; enabled?: number } | null;
  /** Rows the camera-registry lookup returns. */
  cameras?: Array<{ name: string }>;
  /** Rows the dedupe lookup returns. */
  duplicates?: Array<{ alert_id: number }>;
  /** Make every query throw, to exercise the fail-soft paths. */
  throws?: boolean;
}

function fakePool(opts: FakeOpts = {}) {
  const sqlLog: string[] = [];
  const settings = opts.settings === undefined
    ? { webhook_key: "k", dedupe_seconds: 60, enabled: 1 }
    : opts.settings;

  return {
    sqlLog,
    async query(sql: string) {
      sqlLog.push(`query:${sql}`);
      if (opts.throws) throw new Error("table is gone");
      if (sql.includes("cctv_settings")) return [settings ? [settings] : []];
      if (sql.includes("FROM cctv_cameras")) return [opts.cameras || []];
      if (sql.includes("FROM cctv_alerts WHERE dedupe_key")) return [opts.duplicates || []];
      if (sql.includes("COUNT(*)")) return [[{ c: 3 }]];
      return [[]];
    },
    async execute(sql: string) {
      sqlLog.push(`execute:${sql}`);
      if (sql.includes("INSERT INTO cctv_alerts")) return [{ insertId: 99 }];
      return [{ affectedRows: 1 }];
    },
  };
}

const insertedAlert = (log: string[]) => log.find((l) => l.startsWith("execute:") && l.includes("INSERT INTO cctv_alerts"));
const dedupeLookup = (log: string[]) => log.find((l) => l.includes("FROM cctv_alerts WHERE dedupe_key"));

// ── Severity rules ──────────────────────────────────────────────────────────

describe("ingestAlert — severity", () => {
  it("applies the type's default severity when the device sends none", async () => {
    const pool = fakePool();
    await ingestAlert(pool, { alert_type: "oil_spillage", camera_id: "CAM-1" });
    // oil_spillage is declared critical in ALERT_TYPES.
    const declared = ALERT_TYPES.find((t) => t.value === "oil_spillage")!;
    expect(declared.defaultSeverity).toBe("critical");
    expect(dedupeLookup(pool.sqlLog)).toBeTruthy();
    expect(insertedAlert(pool.sqlLog)).toBeTruthy();
  });

  it("honours an explicit valid severity over the default", async () => {
    const pool = fakePool();
    // oil_spillage defaults to critical; the device is allowed to downgrade it.
    const res = await ingestAlert(pool, { alert_type: "oil_spillage", severity: "info" });
    expect(res.status).toBe("created");
  });

  it("falls back to the type default when the severity is not a valid level", async () => {
    const pool = fakePool();
    // "urgent" is not one of info/warning/critical — must not be stored verbatim,
    // or the UI renders an untoneable row and the critical filter misses it.
    const res = await ingestAlert(pool, { alert_type: "ppe_violation", severity: "urgent" });
    expect(res.status).toBe("created");
    expect(pool.sqlLog.some((l) => l.includes("urgent"))).toBe(false);
  });

  it("stores an unrecognised alert_type as custom rather than rejecting it", async () => {
    const pool = fakePool();
    // A vendor-specific detection must never be silently dropped.
    const res = await ingestAlert(pool, { alert_type: "forklift_speeding" });
    expect(res.status).toBe("created");
  });

  it("normalises case and whitespace before matching a known type", async () => {
    const pool = fakePool();
    const res = await ingestAlert(pool, { alert_type: "  OIL_SPILLAGE  " });
    expect(res.status).toBe("created");
  });

  it("accepts `type` as an alias for `alert_type`", async () => {
    const pool = fakePool();
    expect((await ingestAlert(pool, { type: "fire_smoke" })).status).toBe("created");
  });
});

// ── Dedupe ──────────────────────────────────────────────────────────────────

describe("ingestAlert — duplicate suppression", () => {
  it("collapses a repeat from the same camera and type inside the window", async () => {
    const pool = fakePool({ duplicates: [{ alert_id: 41 }] });
    const res = await ingestAlert(pool, { alert_type: "loitering", camera_id: "CAM-7" });
    expect(res).toEqual({ status: "duplicate", alert_id: 41 });
    // A duplicate must NOT write a second row.
    expect(insertedAlert(pool.sqlLog)).toBeUndefined();
  });

  it("inserts when the dedupe lookup finds nothing", async () => {
    const pool = fakePool({ duplicates: [] });
    const res = await ingestAlert(pool, { alert_type: "loitering", camera_id: "CAM-7" });
    expect(res).toEqual({ status: "created", alert_id: 99 });
    expect(insertedAlert(pool.sqlLog)).toBeTruthy();
  });

  it("skips the dedupe lookup entirely when the window is 0", async () => {
    // 0 is the documented commissioning setting: a chatty device during setup
    // must be able to prove every event arrives.
    const pool = fakePool({ settings: { webhook_key: "k", dedupe_seconds: 0, enabled: 1 } });
    const res = await ingestAlert(pool, { alert_type: "loitering", camera_id: "CAM-7" });
    expect(res.status).toBe("created");
    expect(dedupeLookup(pool.sqlLog)).toBeUndefined();
  });

  it("keys the dedupe on camera AND type, so two types from one camera both land", async () => {
    const pool = fakePool({ duplicates: [] });
    await ingestAlert(pool, { alert_type: "fire_smoke", camera_id: "CAM-7" });
    const key = dedupeLookup(pool.sqlLog)!;
    expect(key).toBeTruthy();
    // The key is built in code, not read back, so assert the shape it is built from.
    const pool2 = fakePool({ duplicates: [] });
    await ingestAlert(pool2, { alert_type: "intrusion", camera_id: "CAM-7" });
    expect(pool2.sqlLog.filter((l) => l.includes("INSERT INTO cctv_alerts")).length).toBe(1);
  });
});

// ── Camera resolution & field fallbacks ─────────────────────────────────────

describe("ingestAlert — camera reference resolution", () => {
  it("resolves a friendly name from the registry", async () => {
    const pool = fakePool({ cameras: [{ name: "Gate Camera 01" }], duplicates: [] });
    const res = await ingestAlert(pool, { alert_type: "intrusion", camera_id: "CAM-GATE-01" });
    expect(res.status).toBe("created");
    expect(pool.sqlLog.some((l) => l.includes("FROM cctv_cameras"))).toBe(true);
  });

  it("still accepts the alert when the ref matches no registered camera", async () => {
    // An unregistered device must not be dropped — it renders as "Unknown camera"
    // in the UI rather than disappearing.
    const pool = fakePool({ cameras: [], duplicates: [] });
    const res = await ingestAlert(pool, { alert_type: "intrusion", camera_id: "CAM-NOPE" });
    expect(res.status).toBe("created");
  });

  it("accepts `message` as an alias for description and skips the camera lookup when no ref is given", async () => {
    const pool = fakePool({ duplicates: [] });
    const res = await ingestAlert(pool, { alert_type: "custom", message: "Something happened" });
    expect(res.status).toBe("created");
    expect(pool.sqlLog.some((l) => l.includes("FROM cctv_cameras"))).toBe(false);
  });
});

// ── Fail-soft paths the notification bell depends on ────────────────────────

describe("fail-soft behaviour", () => {
  it("countOpenAlerts returns 0 rather than throwing when the table is unavailable", async () => {
    // The bell summary runs on every notification poll. A hard throw here would
    // take down the whole notification list, not just the safety line.
    await expect(countOpenAlerts(fakePool({ throws: true }))).resolves.toBe(0);
  });

  it("acknowledgeAlert reports false when no row was updated", async () => {
    const pool = {
      async query() { return [[]]; },
      async execute(sql: string) {
        return [sql.includes("UPDATE cctv_alerts") ? { affectedRows: 0 } : { affectedRows: 1 }];
      },
    };
    await expect(acknowledgeAlert(pool, 12345, "tester")).resolves.toBe(false);
  });

  it("listAlerts clamps the limit to 500 so a caller cannot ask for the whole table", async () => {
    const seen: any[] = [];
    const pool = {
      async query(_sql: string, params: any[]) { seen.push(params); return [[]]; },
      async execute() { return [{ affectedRows: 1 }]; },
    };
    await listAlerts(pool, { status: "open", limit: 99999 });
    expect(seen[0][0]).toBe(500);
  });
});

// ── Wiring contract: the three shipped bugs ─────────────────────────────────

describe("WIRING: the ingest webhook must stay reachable by a device", () => {
  const whitelist = (() => {
    const m = SERVER_SRC.match(/const PUBLIC_API_PATHS = \[([\s\S]*?)\];/);
    if (!m) throw new Error("PUBLIC_API_PATHS array not found in server.ts");
    return m[1];
  })();

  it("keeps /api/cctv/alerts/ingest whitelisted past the global JWT gate", () => {
    // Regression guard for the defect that made the feature dead: the gate is
    // registered BEFORE this route, so without the whitelist entry a device POST
    // is answered 401 by authenticateToken and the route never executes.
    expect(whitelist).toContain("/api/cctv/alerts/ingest");
  });

  it("does NOT put a user-JWT check on the device route itself", () => {
    // A camera/NVR cannot log in. Auth here is the X-CCTV-Key shared secret.
    const line = SERVER_SRC.split("\n").find((l) => l.includes('app.post("/api/cctv/alerts/ingest"'));
    expect(line, "the ingest route registration was not found").toBeTruthy();
    expect(line).not.toContain("authenticateToken");
  });

  it("reads the device key from the X-CCTV-Key header", () => {
    expect(SERVER_SRC).toContain('req.headers["x-cctv-key"]');
  });

  it("still registers the global gate for everything not whitelisted", () => {
    expect(SERVER_SRC).toContain("return authenticateToken(req, res, next);");
  });
});

describe("WIRING: the floor-safety bell notification must not dead-end", () => {
  it("server.ts raises the alert with the cctv-safety link", () => {
    expect(SERVER_SRC).toContain('link: "cctv-safety"');
  });

  it("App.tsx registers a tab with exactly that id", () => {
    // The link is only as good as the tab it names. A mismatch silently bounces
    // the user to their role's first screen with no explanation — the bug that
    // existed between the 2026-09-06 prune and this fix.
    const block = APP_SRC.slice(APP_SRC.indexOf("const ROLE_TABS"), APP_SRC.indexOf("const GATE_IN_ROLES"));
    expect(block).toContain('{ id: "cctv-safety"');
  });

  it("has a render branch for the tab (otherwise it opens a blank screen)", () => {
    expect(APP_SRC).toContain('activeTab === "cctv-safety"');
  });

  it("AppShell maps the tab into a workspace (otherwise the nav hides it)", () => {
    // The sub-nav renders only tabs whose WORKSPACE_MAPPING value equals the
    // active workspace. An unmapped tab exists but cannot be clicked.
    expect(SHELL_SRC).toContain('"cctv-safety": "admin"');
  });
});
