/**
 * =============================================================================
 * In-house auto-fix: structured actions only.
 * -----------------------------------------------------------------------------
 * The feedback triage asks DeepSeek for an "in-house action". The model answers
 * in prose ("Immediately review the code for the 'users' screen..."), and the
 * apply endpoint used to hand that string straight to dbPool.query() - which is
 * both why the button always failed with a SQL syntax error, and an arbitrary
 * SQL execution hole (its only guard was a substring test for "drop"/"truncate",
 * which DELETE / UPDATE / ALTER walk straight past).
 *
 * Free text is never executed. An action is applied only when it matches this
 * fixed catalogue and every value is bound as a parameter. Anything else is
 * reported as not auto-applicable and routed into the cumulative IDE prompt.
 * =============================================================================
 */

export type InHouseAction =
  | { kind: "permission"; role: string; module: string; grants: Record<string, 0 | 1> }
  | { kind: "setting"; key: string; value: string };

export interface ParseResult {
  applicable: boolean;
  action?: InHouseAction;
  /** Why this could not be auto-applied — surfaced to the user verbatim. */
  reason?: string;
}

const PERMISSION_FLAGS = [
  "can_view", "can_create", "can_edit", "can_delete", "can_approve",
  "can_reject", "can_print", "can_export", "can_import", "can_assign",
  "can_close", "can_reopen", "can_admin", "can_configure",
] as const;

const IDENT = /^[A-Za-z0-9 _-]{1,64}$/;
const SETTING_KEY = /^[a-z0-9_]{1,64}$/;

/**
 * A triage row is auto-applicable only if it carries a structured JSON action.
 * Prose stays prose.
 */
export function parseInHouseAction(raw: unknown): ParseResult {
  if (raw == null || String(raw).trim() === "") {
    return { applicable: false, reason: "No in-house action was recorded for this report." };
  }

  const text = String(raw).trim();
  if (!text.startsWith("{")) {
    return {
      applicable: false,
      reason: "The triage returned a prose recommendation, not a structured action. This needs a code change — it has been added to the cumulative IDE prompt.",
    };
  }

  let parsed: any;
  try { parsed = JSON.parse(text); }
  catch { return { applicable: false, reason: "In-house action is not valid JSON." }; }

  if (parsed?.kind === "permission") {
    const { role, module } = parsed;
    if (!IDENT.test(String(role || "")) || !IDENT.test(String(module || ""))) {
      return { applicable: false, reason: "Permission action names a role or module that is not a plain identifier." };
    }
    const grants: Record<string, 0 | 1> = {};
    for (const flag of PERMISSION_FLAGS) {
      if (parsed.grants && flag in parsed.grants) grants[flag] = parsed.grants[flag] ? 1 : 0;
    }
    if (Object.keys(grants).length === 0) {
      return { applicable: false, reason: "Permission action lists no recognised permission flags." };
    }
    return { applicable: true, action: { kind: "permission", role: String(role), module: String(module), grants } };
  }

  if (parsed?.kind === "setting") {
    if (!SETTING_KEY.test(String(parsed.key || ""))) {
      return { applicable: false, reason: "Setting action names a key that is not a plain snake_case identifier." };
    }
    return { applicable: true, action: { kind: "setting", key: String(parsed.key), value: String(parsed.value ?? "") } };
  }

  return { applicable: false, reason: `Unsupported in-house action kind '${parsed?.kind ?? "(missing)"}'.` };
}

/** Applies a parsed action. Every value is bound; no string interpolation. */
export async function applyInHouseAction(dbPool: any, action: InHouseAction): Promise<string> {
  if (action.kind === "permission") {
    const [roleRows]: any = await dbPool.query(
      "SELECT role_id FROM roles WHERE REPLACE(LOWER(role_name),' ','_') = REPLACE(LOWER(?),' ','_')", [action.role]);
    const [moduleRows]: any = await dbPool.query(
      "SELECT module_id FROM modules WHERE LOWER(module_name) = LOWER(?)", [action.module]);
    if (!roleRows?.length) throw new Error(`Unknown role '${action.role}'.`);
    if (!moduleRows?.length) throw new Error(`Unknown module '${action.module}'.`);

    const roleId = roleRows[0].role_id;
    const moduleId = moduleRows[0].module_id;
    const flags = Object.keys(action.grants);
    const columns = ["role_id", "module_id", ...flags];
    const values = [roleId, moduleId, ...flags.map(f => action.grants[f])];

    await dbPool.execute(
      `INSERT INTO role_permissions (${columns.map(c => `\`${c}\``).join(", ")})
       VALUES (${columns.map(() => "?").join(", ")})
       ON DUPLICATE KEY UPDATE ${flags.map(f => `\`${f}\` = VALUES(\`${f}\`)`).join(", ")}`,
      values);
    return `Set ${flags.join(", ")} for role '${action.role}' on module '${action.module}'.`;
  }

  await dbPool.execute(
    `INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [action.key, action.value]);
  return `Set '${action.key}' to '${action.value}'.`;
}

/**
 * One cumulative prompt covering every report that could not be auto-applied,
 * so the IDE agent gets a single pass instead of one prompt per bug.
 */
export function buildCumulativeIdePrompt(rows: any[]): string {
  if (!rows.length) return "No outstanding bug reports or feedback require a code fix.";

  const header = `You are an AI agent working in the DWIP Enterprise repository (React + TypeScript frontend, Express monolith in server.ts, MySQL via mysql2).

Below are ${rows.length} outstanding report(s) from live UAT that could NOT be resolved by an in-house configuration change and require code fixes. Address every one of them in a single pass. For each, locate the real root cause before editing, and do not fabricate data or add mock fallbacks.

`;

  const blocks = rows.map((r, i) => {
    const parts = [
      `### ${i + 1}. [${r.ai_severity || "UNKNOWN"}] ${r.feedback_type || "REPORT"} on screen "${r.screen_id || "unknown"}"`,
      `Reported by: ${r.reporter_name || r.role || "unknown"}${r.created_at ? ` on ${new Date(r.created_at).toISOString().slice(0, 10)}` : ""}`,
      ``,
      `User's report:`,
      (r.message || "(no message)").trim(),
    ];
    if (r.ai_analysis) parts.push(``, `Triage root-cause analysis:`, String(r.ai_analysis).trim());
    if (r.ai_suggested_fix) parts.push(``, `Suggested fix:`, String(r.ai_suggested_fix).trim());
    if (r.ide_agent_prompt) parts.push(``, `Prior per-bug prompt:`, String(r.ide_agent_prompt).trim());
    return parts.join("\n");
  });

  const footer = `

---
After implementing: run the existing test suite, and report which of the ${rows.length} items are fixed, which are not reproducible, and which need product decisions.`;

  return header + blocks.join("\n\n---\n\n") + footer;
}
