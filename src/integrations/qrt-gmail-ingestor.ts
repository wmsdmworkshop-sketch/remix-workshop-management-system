/**
 * =============================================================================
 * QRT Gmail Ingestor
 * -----------------------------------------------------------------------------
 * Watches a dealership Gmail inbox (READ-ONLY) for Tata "QRT / breakdown" alert
 * emails and auto-creates breakdown cases in DWIP with a P1 (2-hour) SLA clock.
 *
 * Design principles:
 *  - Reads the dealer's OWN mailbox via IMAP + a Gmail App Password. It does NOT
 *    touch, impersonate, or automate the Tata app in any way.
 *  - Never modifies the mailbox (no \Seen flags, no moves). Idempotency is
 *    achieved by de-duping on the Tata CSR number against the breakdowns table.
 *  - Fully OFF unless QRT_GMAIL_USER + QRT_GMAIL_APP_PASSWORD are set. Missing
 *    config = dormant, never a crash (graceful fallback).
 *
 * Env:
 *  QRT_GMAIL_USER            Gmail address to read (e.g. alerts@devanand...).
 *  QRT_GMAIL_APP_PASSWORD    16-char Google App Password (needs 2-Step Verif.).
 *  QRT_GMAIL_HOST            IMAP host (default: imap.gmail.com).
 *  QRT_GMAIL_PORT            IMAP port (default: 993).
 *  QRT_GMAIL_MAILBOX         Mailbox to scan (default: INBOX).
 *  QRT_SENDER_FILTER         Only consider senders containing this (default: tatamotors.com).
 *  QRT_LOOKBACK_HOURS        How far back to scan each poll (default: 48).
 *  QRT_POLL_INTERVAL_MS      Poll cadence (default: 60000 = 1 min).
 * =============================================================================
 */

import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface ParsedQrtAlert {
  csr: string | null;            // Tata CSR / complaint number, e.g. "1-214966338568"
  vehicleNumber: string | null;  // Registration, e.g. "RJ11GC7476"
  complaint: string;             // Human-readable complaint summary
  customerName: string | null;
  city: string | null;
  chassis: string | null;
  model: string | null;          // PL, e.g. "1916 LPT SWB"
  amcType: string | null;
  amcStatus: string | null;
  openedAt: Date | null;         // CSR Opened Date/Time if present
  remarks: string;               // Assembled detail block (nothing lost)
}

const clean = (v: string | undefined | null): string | null => {
  if (!v) return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t.length ? t : null;
};

/** Pull "Label: value" style fields (structured "TATA ALERT - NEW CASE" emails). */
const field = (text: string, label: string): string | null => {
  // Match "Label: value" up to end-of-line; label matched loosely (spaces/case).
  const re = new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*[:\\-]\\s*(.+)", "i");
  const m = text.match(re);
  if (!m) return null;
  // Stop at the next "Word:" on the same captured line fragment is already line-bounded.
  return clean(m[1]);
};

/** Best-effort Indian commercial-vehicle registration finder (fallback). */
const findRegNo = (s: string): string | null => {
  const m = s.match(/\b([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{3,4})\b/);
  return m ? m[1] : null;
};

const parseDateSafe = (s: string | null): Date | null => {
  if (!s) return null;
  // Handles "04/09/2026 09:17:13" (dd/mm/yyyy) and similar.
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, dd, mm, yyyy, hh = "0", mi = "0", ss = "0"] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi), Number(ss));
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Parse either QRT alert format:
 *  1) Structured "TATA ALERT - NEW CASE" (CSR No / Vehicle Reg No / Complaint Area...).
 *  2) Human "Urgent breakdown support required" (Vehicle Number / CSR / Complaint).
 * Returns null when the message doesn't look like a QRT alert.
 */
export function parseQrtAlert(subject: string, body: string): ParsedQrtAlert | null {
  const text = (body || "").replace(/\r/g, "");
  const hay = `${subject}\n${text}`;

  // --- CSR number (the primary key we de-dupe on) ---
  let csr =
    field(text, "CSR No") ||
    field(text, "CSR Number") ||
    field(text, "CSR");
  if (csr) {
    const cm = csr.match(/1-\d{6,}/);
    csr = cm ? cm[0] : clean(csr);
  }
  if (!csr) {
    const cm = hay.match(/\b1-\d{9,}\b/); // e.g. 1-214966338568
    csr = cm ? cm[0] : null;
  }

  // --- Vehicle registration ---
  let vehicleNumber =
    field(text, "Vehicle Reg No") ||
    field(text, "Vehicle Number") ||
    field(text, "Vehicle No") ||
    field(text, "Vehicle");
  if (vehicleNumber) {
    const reg = findRegNo(vehicleNumber.toUpperCase());
    vehicleNumber = reg || clean(vehicleNumber.toUpperCase());
  }
  if (!vehicleNumber) vehicleNumber = findRegNo(subject.toUpperCase());

  // Not a QRT alert if we can't identify either a CSR or a vehicle.
  if (!csr && !vehicleNumber) return null;

  // --- Complaint ---
  const area = field(text, "Complaint Area");
  const subArea = field(text, "Complaint Sub-Area") || field(text, "Complaint SubArea");
  const humanComplaint = field(text, "Complaint");
  let complaint =
    [area, subArea].filter(Boolean).join(" - ") ||
    humanComplaint ||
    "Breakdown alert (QRT)";
  complaint = clean(complaint) || "Breakdown alert (QRT)";

  const customerName = field(text, "Customer Name");
  const city = field(text, "City/Town/Village") || field(text, "City");
  const chassis = field(text, "Chassis No") || field(text, "Chassis");
  const model = field(text, "PL");
  const amcType = field(text, "AMC Type");
  const amcStatus = field(text, "AMC Status");
  const source = field(text, "Source");
  const handling = field(text, "Handling Division");
  const detailed = field(text, "Detailed Description");
  const openedAt = parseDateSafe(field(text, "CSR Opened Date/Time") || field(text, "CSR Opened Date"));

  const remarks = [
    "Auto-ingested from Tata Alert email.",
    customerName ? `Customer: ${customerName}` : null,
    chassis ? `Chassis: ${chassis}` : null,
    model ? `Model: ${model}` : null,
    source ? `Source: ${source}` : null,
    handling ? `Handling Division: ${handling}` : null,
    amcType || amcStatus ? `AMC: ${[amcType, amcStatus].filter(Boolean).join(" / ")}` : null,
    detailed ? `Detail: ${detailed}` : null,
  ].filter(Boolean).join(" | ");

  return {
    csr,
    vehicleNumber,
    complaint,
    customerName,
    city,
    chassis,
    model,
    amcType,
    amcStatus,
    openedAt,
    remarks,
  };
}

const toMysqlDatetime = (d: Date): string => d.toISOString().slice(0, 19).replace("T", " ");

/** Insert a parsed alert as a P1 (2-hour SLA) breakdown, de-duping on CSR. */
async function ingestAlert(dbPool: any, alert: ParsedQrtAlert): Promise<"inserted" | "duplicate" | "skipped"> {
  if (!alert.vehicleNumber && !alert.csr) return "skipped";

  // De-dupe on the Tata CSR number (idempotent — no mailbox flags needed).
  if (alert.csr) {
    const [dup] = await dbPool.query(
      "SELECT breakdown_id FROM breakdowns WHERE tata_complaint_number = ? LIMIT 1",
      [alert.csr]
    ) as any[];
    if (dup && dup.length) return "duplicate";
  }

  const now = new Date();
  const complaintDate = toMysqlDatetime(alert.openedAt || now);
  const srNumber = `SR-${Date.now().toString().slice(-6)}`;
  const internalNumber = `IBD-${Date.now()}`;
  const history = [{
    status: "Complaint Received",
    user: "QRT Email Ingestor",
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    gps: "",
    remarks: "Auto-created from Tata QRT alert email",
  }];

  await dbPool.execute(
    `INSERT INTO breakdowns (
       sr_number, complaint_date, tata_complaint_number, internal_breakdown_number,
       vehicle_number, priority, sla_limit_hours, driver_name, gps_address,
       complaint, claim_type, description_remarks, current_status, status_history
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      srNumber, complaintDate, alert.csr || null, internalNumber,
      alert.vehicleNumber || "UNKNOWN", "P1", 2, alert.customerName || null, alert.city || null,
      alert.complaint, "Paid", alert.remarks, "Complaint Received", JSON.stringify(history),
    ]
  );
  return "inserted";
}

interface QrtConfig {
  user: string;
  pass: string;
  host: string;
  port: number;
  mailbox: string;
  senderFilter: string;
  lookbackHours: number;
  pollIntervalMs: number;
}

/** Public (no-secret) view of the ingestor settings, safe to send to the UI. */
export interface QrtPublicConfig {
  gmail_user: string;
  host: string;
  port: number;
  mailbox: string;
  sender_filter: string;
  lookback_hours: number;
  poll_interval_ms: number;
  enabled: boolean;
  has_password: boolean;
}

const DEFAULT_GMAIL_USER = "devanandautomobilescrmsv@gmail.com";

let settingsTableReady = false;
async function ensureSettingsTable(dbPool: any): Promise<void> {
  if (settingsTableReady) return;
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS qrt_ingestor_settings (
      id INT PRIMARY KEY,
      gmail_user VARCHAR(255),
      app_password VARCHAR(255),
      host VARCHAR(255),
      port INT,
      mailbox VARCHAR(255),
      sender_filter VARCHAR(255),
      lookback_hours INT,
      poll_interval_ms INT,
      enabled TINYINT(1) DEFAULT 1,
      updated_at DATETIME
    )
  `);
  settingsTableReady = true;
}

/** Read the single settings row, seeding defaults (from env, if present) on first use. */
async function getSettingsRow(dbPool: any): Promise<any> {
  await ensureSettingsTable(dbPool);
  const [rows] = await dbPool.query("SELECT * FROM qrt_ingestor_settings WHERE id = 1") as any[];
  if (rows && rows.length) return rows[0];

  const seed = {
    gmail_user: process.env.QRT_GMAIL_USER || DEFAULT_GMAIL_USER,
    app_password: process.env.QRT_GMAIL_APP_PASSWORD || "",
    host: process.env.QRT_GMAIL_HOST || "imap.gmail.com",
    port: Number(process.env.QRT_GMAIL_PORT || 993),
    mailbox: process.env.QRT_GMAIL_MAILBOX || "INBOX",
    sender_filter: (process.env.QRT_SENDER_FILTER || "tatamotors.com").toLowerCase(),
    lookback_hours: Number(process.env.QRT_LOOKBACK_HOURS || 48),
    poll_interval_ms: Number(process.env.QRT_POLL_INTERVAL_MS || 60000),
    enabled: 1,
  };
  await dbPool.execute(
    `INSERT INTO qrt_ingestor_settings
       (id, gmail_user, app_password, host, port, mailbox, sender_filter, lookback_hours, poll_interval_ms, enabled, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [seed.gmail_user, seed.app_password, seed.host, seed.port, seed.mailbox,
     seed.sender_filter, seed.lookback_hours, seed.poll_interval_ms, seed.enabled]
  );
  const [again] = await dbPool.query("SELECT * FROM qrt_ingestor_settings WHERE id = 1") as any[];
  return again[0];
}

/** Effective runtime config; returns null (disabled) when off or missing credentials. */
async function readConfig(dbPool: any): Promise<QrtConfig | null> {
  let row: any;
  try {
    row = await getSettingsRow(dbPool);
  } catch {
    // DB unreachable — fall back to env so the feature can still run if configured that way.
    const user = process.env.QRT_GMAIL_USER;
    const pass = process.env.QRT_GMAIL_APP_PASSWORD;
    if (!user || !pass) return null;
    return {
      user, pass,
      host: process.env.QRT_GMAIL_HOST || "imap.gmail.com",
      port: Number(process.env.QRT_GMAIL_PORT || 993),
      mailbox: process.env.QRT_GMAIL_MAILBOX || "INBOX",
      senderFilter: (process.env.QRT_SENDER_FILTER || "tatamotors.com").toLowerCase(),
      lookbackHours: Number(process.env.QRT_LOOKBACK_HOURS || 48),
      pollIntervalMs: Number(process.env.QRT_POLL_INTERVAL_MS || 60000),
    };
  }

  const user = row.gmail_user || process.env.QRT_GMAIL_USER;
  const pass = row.app_password || process.env.QRT_GMAIL_APP_PASSWORD;
  if (!Number(row.enabled) || !user || !pass) return null;
  return {
    user,
    pass,
    host: row.host || "imap.gmail.com",
    port: Number(row.port || 993),
    mailbox: row.mailbox || "INBOX",
    senderFilter: String(row.sender_filter || "tatamotors.com").toLowerCase(),
    lookbackHours: Number(row.lookback_hours || 48),
    pollIntervalMs: Number(row.poll_interval_ms || 60000),
  };
}

/** UI-facing settings (never exposes the app password). */
export async function getQrtPublicConfig(dbPool: any): Promise<QrtPublicConfig> {
  const row = await getSettingsRow(dbPool);
  return {
    gmail_user: row.gmail_user || "",
    host: row.host || "imap.gmail.com",
    port: Number(row.port || 993),
    mailbox: row.mailbox || "INBOX",
    sender_filter: row.sender_filter || "tatamotors.com",
    lookback_hours: Number(row.lookback_hours || 48),
    poll_interval_ms: Number(row.poll_interval_ms || 60000),
    enabled: !!Number(row.enabled),
    has_password: !!(row.app_password || process.env.QRT_GMAIL_APP_PASSWORD),
  };
}

/** Update settings. app_password is only changed when a non-empty value is supplied. */
export async function updateQrtSettings(dbPool: any, patch: any): Promise<QrtPublicConfig> {
  await getSettingsRow(dbPool); // ensure row exists
  const fields: string[] = [];
  const vals: any[] = [];
  const set = (col: string, v: any) => { fields.push(`${col} = ?`); vals.push(v); };

  if (typeof patch.gmail_user === "string" && patch.gmail_user.trim()) set("gmail_user", patch.gmail_user.trim());
  if (typeof patch.app_password === "string" && patch.app_password.length) set("app_password", patch.app_password);
  if (typeof patch.host === "string" && patch.host.trim()) set("host", patch.host.trim());
  if (patch.port !== undefined && patch.port !== null && patch.port !== "") set("port", Number(patch.port));
  if (typeof patch.mailbox === "string" && patch.mailbox.trim()) set("mailbox", patch.mailbox.trim());
  if (typeof patch.sender_filter === "string" && patch.sender_filter.trim()) set("sender_filter", patch.sender_filter.trim().toLowerCase());
  if (patch.lookback_hours !== undefined && patch.lookback_hours !== null && patch.lookback_hours !== "") set("lookback_hours", Number(patch.lookback_hours));
  if (patch.poll_interval_ms !== undefined && patch.poll_interval_ms !== null && patch.poll_interval_ms !== "") set("poll_interval_ms", Number(patch.poll_interval_ms));
  if (patch.enabled !== undefined) set("enabled", patch.enabled ? 1 : 0);

  if (fields.length) {
    set("updated_at", new Date().toISOString().slice(0, 19).replace("T", " "));
    await dbPool.execute(`UPDATE qrt_ingestor_settings SET ${fields.join(", ")} WHERE id = 1`, vals);
  }
  return getQrtPublicConfig(dbPool);
}

/** Run a single scan of the mailbox. Returns a small summary for logs/manual runs. */
export async function runQrtIngestOnce(
  dbPool: any
): Promise<{ enabled: boolean; scanned: number; inserted: number; duplicates: number; error?: string }> {
  const cfg = await readConfig(dbPool);
  if (!cfg) return { enabled: false, scanned: 0, inserted: 0, duplicates: 0 };

  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
  });

  let scanned = 0, inserted = 0, duplicates = 0;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(cfg.mailbox);
    try {
      const since = new Date(Date.now() - cfg.lookbackHours * 3600 * 1000);
      const uids = await client.search({ since }, { uid: true });
      const list = Array.isArray(uids) ? uids : [];
      for (const uid of list) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const from = (parsed.from?.text || "").toLowerCase();
        if (cfg.senderFilter && !from.includes(cfg.senderFilter)) continue;
        scanned++;
        const alert = parseQrtAlert(parsed.subject || "", parsed.text || "");
        if (!alert) continue;
        const result = await ingestAlert(dbPool, alert);
        if (result === "inserted") inserted++;
        else if (result === "duplicate") duplicates++;
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return { enabled: true, scanned, inserted, duplicates };
  } catch (err: any) {
    try { await client.close(); } catch { /* ignore */ }
    return { enabled: true, scanned, inserted, duplicates, error: err?.message || String(err) };
  }
}

let started = false;

/**
 * Start the background poller. Safe to call once at server startup.
 * The poller ALWAYS runs on a base cadence; each tick re-reads the DB-backed
 * config, so the mailbox/password/enabled flag can be changed from the UI at
 * runtime with no redeploy. When disabled or unconfigured, a tick is a no-op.
 */
export function startQrtGmailIngestor(dbPool: any): void {
  if (started) return;
  started = true;

  const baseIntervalMs = Number(process.env.QRT_POLL_INTERVAL_MS || 60000);
  console.log(`[QRT] Gmail ingestor scheduler active (base cadence ${Math.round(baseIntervalMs / 1000)}s). Configure via Breakdowns → QRT Email Sync.`);

  let running = false;
  const tick = async () => {
    if (running) return; // never overlap polls
    running = true;
    try {
      const r = await runQrtIngestOnce(dbPool);
      if (r.error) console.error("[QRT] scan error:", r.error);
      else if (r.inserted) console.log(`[QRT] scan: ${r.inserted} new breakdown(s) created, ${r.duplicates} dup skipped.`);
    } catch (err: any) {
      console.error("[QRT] poll failed:", err?.message || err);
    } finally {
      running = false;
    }
  };

  // First run shortly after boot, then on the base cadence.
  setTimeout(tick, 10000);
  setInterval(tick, baseIntervalMs);
}
