/**
 * =============================================================================
 * CCTV & Floor-Safety Analytics Hub
 * -----------------------------------------------------------------------------
 * DWIP does NOT run video analytics itself. This is a vendor-neutral hub: any
 * camera / VMS / edge-AI box that can POST an HTTP alert (Hikvision, Dahua,
 * Milesight, Milestone, a YOLO edge box, etc.) pushes detections here and DWIP
 * turns them into an actionable Floor-Safety feed.
 *
 *  - Camera registry: dealership fills in each camera's details (zone, vendor,
 *    stream URL). Read/written via the UI.
 *  - Generic alert webhook: one endpoint accepts any detection type. Auth via a
 *    shared secret so only your own devices can post. Disabled until configured.
 *  - Alert feed: list + acknowledge; drives the notification bell.
 *
 * Legitimate by design: it only ingests events pushed FROM your own hardware.
 * =============================================================================
 */

export const ALERT_TYPES: { value: string; label: string; defaultSeverity: string }[] = [
  { value: "idle_manpower", label: "Idle Manpower", defaultSeverity: "warning" },
  { value: "oil_spillage", label: "Oil Spillage", defaultSeverity: "critical" },
  { value: "object_on_floor", label: "Object on Floor", defaultSeverity: "warning" },
  { value: "unidentified_person", label: "Unidentified Person", defaultSeverity: "critical" },
  { value: "ppe_violation", label: "PPE / Safety Gear Violation", defaultSeverity: "warning" },
  { value: "loitering", label: "Loitering", defaultSeverity: "warning" },
  { value: "fire_smoke", label: "Fire / Smoke", defaultSeverity: "critical" },
  { value: "intrusion", label: "Intrusion (After Hours)", defaultSeverity: "critical" },
  { value: "custom", label: "Custom", defaultSeverity: "info" },
];

const VALID_SEVERITY = new Set(["info", "warning", "critical"]);

let tablesReady = false;
async function ensureTables(dbPool: any): Promise<void> {
  if (tablesReady) return;
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS cctv_cameras (
      camera_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120),
      zone VARCHAR(120),
      vendor VARCHAR(80),
      stream_url VARCHAR(512),
      external_ref VARCHAR(120),
      bay_id INT,
      enabled TINYINT(1) DEFAULT 1,
      created_at DATETIME,
      updated_at DATETIME
    )
  `);
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS cctv_alerts (
      alert_id INT AUTO_INCREMENT PRIMARY KEY,
      camera_ref VARCHAR(120),
      camera_name VARCHAR(120),
      alert_type VARCHAR(60),
      severity VARCHAR(20),
      zone VARCHAR(120),
      description VARCHAR(512),
      snapshot_url VARCHAR(512),
      confidence DECIMAL(5,2),
      detected_at DATETIME,
      status VARCHAR(20) DEFAULT 'OPEN',
      acknowledged_by VARCHAR(120),
      acknowledged_at DATETIME,
      dedupe_key VARCHAR(160),
      created_at DATETIME
    )
  `);
  await dbPool.execute(`
    CREATE TABLE IF NOT EXISTS cctv_settings (
      id INT PRIMARY KEY,
      webhook_key VARCHAR(255),
      dedupe_seconds INT DEFAULT 60,
      enabled TINYINT(1) DEFAULT 1,
      updated_at DATETIME
    )
  `);
  tablesReady = true;
}

const nowSql = () => new Date().toISOString().slice(0, 19).replace("T", " ");

// --- Settings (webhook secret) ---------------------------------------------

async function getSettingsRow(dbPool: any): Promise<any> {
  await ensureTables(dbPool);
  const [rows] = await dbPool.query("SELECT * FROM cctv_settings WHERE id = 1") as any[];
  if (rows && rows.length) return rows[0];
  await dbPool.execute(
    "INSERT INTO cctv_settings (id, webhook_key, dedupe_seconds, enabled, updated_at) VALUES (1, ?, ?, 1, NOW())",
    [process.env.CCTV_WEBHOOK_KEY || "", Number(process.env.CCTV_DEDUPE_SECONDS || 60)]
  );
  const [again] = await dbPool.query("SELECT * FROM cctv_settings WHERE id = 1") as any[];
  return again[0];
}

export async function getCctvConfig(dbPool: any) {
  const row = await getSettingsRow(dbPool);
  return {
    dedupe_seconds: Number(row.dedupe_seconds || 60),
    enabled: !!Number(row.enabled),
    has_webhook_key: !!(row.webhook_key || process.env.CCTV_WEBHOOK_KEY),
    alert_types: ALERT_TYPES,
  };
}

export async function updateCctvConfig(dbPool: any, patch: any) {
  await getSettingsRow(dbPool);
  const fields: string[] = [];
  const vals: any[] = [];
  const set = (c: string, v: any) => { fields.push(`${c} = ?`); vals.push(v); };
  if (typeof patch.webhook_key === "string" && patch.webhook_key.length) set("webhook_key", patch.webhook_key);
  if (patch.dedupe_seconds !== undefined && patch.dedupe_seconds !== "") set("dedupe_seconds", Number(patch.dedupe_seconds));
  if (patch.enabled !== undefined) set("enabled", patch.enabled ? 1 : 0);
  if (fields.length) {
    set("updated_at", nowSql());
    await dbPool.execute(`UPDATE cctv_settings SET ${fields.join(", ")} WHERE id = 1`, vals);
  }
  return getCctvConfig(dbPool);
}

// --- Camera registry --------------------------------------------------------

export async function listCameras(dbPool: any) {
  await ensureTables(dbPool);
  const [rows] = await dbPool.query("SELECT * FROM cctv_cameras ORDER BY camera_id") as any[];
  return rows;
}

export async function upsertCamera(dbPool: any, cam: any) {
  await ensureTables(dbPool);
  const name = (cam.name || "").trim();
  if (!name) throw new Error("Camera name is required.");
  const zone = (cam.zone || "").trim() || null;
  const vendor = (cam.vendor || "").trim() || null;
  const streamUrl = (cam.stream_url || "").trim() || null;
  const externalRef = (cam.external_ref || "").trim() || null;
  const bayId = cam.bay_id !== undefined && cam.bay_id !== null && cam.bay_id !== "" ? Number(cam.bay_id) : null;
  const enabled = cam.enabled === false ? 0 : 1;

  if (cam.camera_id) {
    await dbPool.execute(
      "UPDATE cctv_cameras SET name=?, zone=?, vendor=?, stream_url=?, external_ref=?, bay_id=?, enabled=?, updated_at=? WHERE camera_id=?",
      [name, zone, vendor, streamUrl, externalRef, bayId, enabled, nowSql(), cam.camera_id]
    );
    return { camera_id: cam.camera_id };
  }
  const [result] = await dbPool.execute(
    "INSERT INTO cctv_cameras (name, zone, vendor, stream_url, external_ref, bay_id, enabled, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [name, zone, vendor, streamUrl, externalRef, bayId, enabled, nowSql(), nowSql()]
  ) as any;
  return { camera_id: result.insertId };
}

export async function deleteCamera(dbPool: any, cameraId: number) {
  await ensureTables(dbPool);
  const [result] = await dbPool.execute("DELETE FROM cctv_cameras WHERE camera_id = ?", [cameraId]) as any;
  return result.affectedRows > 0;
}

// --- Alerts -----------------------------------------------------------------

export async function ingestAlert(dbPool: any, body: any): Promise<{ status: "created" | "duplicate"; alert_id?: number }> {
  await ensureTables(dbPool);
  const settings = await getSettingsRow(dbPool);
  const dedupeSeconds = Number(settings.dedupe_seconds || 60);

  const rawType = String(body.alert_type || body.type || "custom").toLowerCase().trim();
  const known = ALERT_TYPES.find(t => t.value === rawType);
  const alertType = known ? known.value : "custom";
  let severity = String(body.severity || "").toLowerCase().trim();
  if (!VALID_SEVERITY.has(severity)) severity = known ? known.defaultSeverity : "info";

  const cameraRef = (body.camera_id || body.camera_ref || "").toString().trim() || null;
  const zone = (body.zone || "").toString().trim() || null;
  const description = (body.description || body.message || "").toString().trim() || null;
  const snapshot = (body.snapshot_url || body.image_url || "").toString().trim() || null;
  const confidence = body.confidence != null && body.confidence !== "" ? Number(body.confidence) : null;
  const detectedAt = body.detected_at ? new Date(body.detected_at) : new Date();
  const detectedSql = isNaN(detectedAt.getTime()) ? nowSql() : detectedAt.toISOString().slice(0, 19).replace("T", " ");

  // Resolve a friendly camera name from the registry if the ref matches.
  let cameraName: string | null = null;
  if (cameraRef) {
    const [cam] = await dbPool.query(
      "SELECT name FROM cctv_cameras WHERE external_ref = ? OR name = ? OR camera_id = ? LIMIT 1",
      [cameraRef, cameraRef, Number(cameraRef) || 0]
    ) as any[];
    if (cam && cam.length) cameraName = cam[0].name;
  }

  // Dedupe: same camera + type within the dedupe window collapses to one alert.
  const dedupeKey = `${cameraRef || "?"}|${alertType}`;
  if (dedupeSeconds > 0) {
    const [dup] = await dbPool.query(
      "SELECT alert_id FROM cctv_alerts WHERE dedupe_key = ? AND created_at > (NOW() - INTERVAL ? SECOND) LIMIT 1",
      [dedupeKey, dedupeSeconds]
    ) as any[];
    if (dup && dup.length) return { status: "duplicate", alert_id: dup[0].alert_id };
  }

  const [result] = await dbPool.execute(
    `INSERT INTO cctv_alerts
       (camera_ref, camera_name, alert_type, severity, zone, description, snapshot_url, confidence, detected_at, status, dedupe_key, created_at)
     VALUES (?,?,?,?,?,?,?,?,?, 'OPEN', ?, ?)`,
    [cameraRef, cameraName, alertType, severity, zone, description, snapshot, confidence, detectedSql, dedupeKey, nowSql()]
  ) as any;
  return { status: "created", alert_id: result.insertId };
}

export async function listAlerts(dbPool: any, opts: { status?: string; limit?: number } = {}) {
  await ensureTables(dbPool);
  const limit = Math.min(Number(opts.limit || 100), 500);
  if (opts.status === "open") {
    const [rows] = await dbPool.query(
      "SELECT * FROM cctv_alerts WHERE status = 'OPEN' ORDER BY alert_id DESC LIMIT ?", [limit]
    ) as any[];
    return rows;
  }
  const [rows] = await dbPool.query(
    "SELECT * FROM cctv_alerts ORDER BY alert_id DESC LIMIT ?", [limit]
  ) as any[];
  return rows;
}

export async function acknowledgeAlert(dbPool: any, alertId: number, user: string) {
  await ensureTables(dbPool);
  const [result] = await dbPool.execute(
    "UPDATE cctv_alerts SET status = 'ACKNOWLEDGED', acknowledged_by = ?, acknowledged_at = ? WHERE alert_id = ?",
    [user || "system", nowSql(), alertId]
  ) as any;
  return result.affectedRows > 0;
}

export async function countOpenAlerts(dbPool: any): Promise<number> {
  try {
    await ensureTables(dbPool);
    const [rows] = await dbPool.query("SELECT COUNT(*) AS c FROM cctv_alerts WHERE status = 'OPEN'") as any[];
    return rows && rows.length ? Number(rows[0].c) : 0;
  } catch {
    return 0;
  }
}
