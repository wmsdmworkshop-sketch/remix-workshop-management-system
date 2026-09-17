/**
 * Chain-of-custody entity indexing.
 *
 * ── The problem this solves ─────────────────────────────────────────────────
 *
 * `tbl_handoff_sla.entity_id` is POLYMORPHIC, but not in the two ways the
 * first implementation assumed. It holds whichever identifier the engine that
 * opened the clock happened to have:
 *
 *   GATE_TO_RECEPTION      -> gateEntryId   ("GE-765B6395")   realtime-ownership-pipeline.ts:218
 *   RECEPTION_TO_MANAGER   -> intakeId      ("INT-…")          :509
 *   SLA_MANAGER_TO_SA      -> intakeId      (same id space)    :750
 *   SA_TO_FLOOR / QC / billing / cashier -> job card number or numeric job_card_id
 *
 * The summary query only searched the job card number and the numeric id, so
 * the three intake stages — the majority of rows in production — could never be
 * matched. A vehicle sitting between gate-in and SA intake therefore reported
 * "Not recorded" for holder, stage, holding-since, SLA due and handoff, even
 * while a clock was running and likely breached.
 *
 * ── How the bridge works ────────────────────────────────────────────────────
 *
 * `job_card_master` carries NO gate_entry_id and NO intake_id (verified against
 * the schema dump), so the link has to come from `tbl_sa_intake`, which holds
 * all three: `job_card_id` (the job card NUMBER, written as job_card_no by
 * sa-technical-intake.ts:687), `gate_entry_id` and `intake_id`.
 *
 * A VRN fallback covers cards that were created but never reached SA intake, so
 * `tbl_sa_intake` has no row for them. It fires ONLY when the registration
 * resolves to exactly one gate entry. On a repeat-visit VRN it resolves
 * nothing, because a wrong holder on a live vehicle is worse than a blank one —
 * the same rule the custody panel already follows for names.
 *
 * No database access here on purpose: this is a pure function of the rows the
 * caller fetched, so every branch is unit-testable without a MySQL instance.
 */

export interface CustodyCardRow {
  job_card_id: number | string;
  job_card_no?: string | null;
  vehicle_reg?: string | null;
}

export interface CustodyIntakeRow {
  /** The job card NUMBER, per sa-technical-intake.ts (not the numeric id). */
  job_card_id?: string | null;
  gate_entry_id?: string | null;
  intake_id?: string | null;
  vrn?: string | null;
}

export interface CustodyGateRow {
  gate_entry_id?: string | null;
  intake_id?: string | null;
  vin?: string | null;
}

export interface CustodyIndex {
  /** Every identifier worth matching `tbl_handoff_sla.entity_id` against. */
  entityKeys: string[];
  /** Normalised entity id -> the numeric job_card_id it belongs to. */
  jobIdByEntity: Map<string, number>;
  /**
   * Job card ids whose gate/intake identity could NOT be resolved, so any row
   * keyed on those ids is unreachable for them. Callers may report this rather
   * than implying the vehicle has no clock at all.
   */
  unresolvedJobIds: number[];
}

/**
 * Registration numbers are compared with punctuation and case removed.
 * `KA28AA2912`, `KA-28-AA-2912` and `ka28aa2912` are the same vehicle.
 */
export function normaliseVrn(v: unknown): string {
  return String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Job card numbers are compared case-insensitively, trimmed. */
function normaliseJcNo(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

/** An entity id is only usable if it is present and not a blank/degenerate value. */
function usableKey(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === "0" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  return s;
}

/**
 * Build the entity_id search space for a set of visible job cards.
 *
 * Keys are added in priority order (job card identity first, then the intake
 * identity), and the map is keyed on the UPPERCASED form so a stored
 * `jc-74450` still resolves to the right card.
 */
export function buildCustodyEntityIndex(
  cards: CustodyCardRow[],
  intakeRows: CustodyIntakeRow[] = [],
  gateRows: CustodyGateRow[] = []
): CustodyIndex {
  const entityKeys: string[] = [];
  const jobIdByEntity = new Map<string, number>();
  const seenKeys = new Set<string>();

  const addKey = (raw: unknown, jobId: number) => {
    const key = usableKey(raw);
    if (!key) return;
    const upper = key.toUpperCase();
    if (!seenKeys.has(upper)) {
      seenKeys.add(upper);
      entityKeys.push(key);
    }
    // First writer wins: a job card's own identifiers must never be
    // overwritten by another card that happens to share an intake id.
    if (!jobIdByEntity.has(upper)) jobIdByEntity.set(upper, jobId);
  };

  // Pass 1 — the identifiers the job card carries itself.
  for (const c of cards) {
    const jid = Number(c.job_card_id);
    if (!Number.isFinite(jid)) continue;
    addKey(c.job_card_no, jid);
    addKey(jid, jid);
  }

  // Pass 2 — the intent this card was created from, via tbl_sa_intake.
  const jcNoToJobId = new Map<string, number>();
  for (const c of cards) {
    const jid = Number(c.job_card_id);
    if (!Number.isFinite(jid)) continue;
    const no = normaliseJcNo(c.job_card_no);
    if (no) jcNoToJobId.set(no, jid);
  }

  const resolved = new Set<number>();
  for (const row of intakeRows) {
    const jid = jcNoToJobId.get(normaliseJcNo(row.job_card_id));
    if (jid === undefined) continue;
    addKey(row.gate_entry_id, jid);
    addKey(row.intake_id, jid);
    resolved.add(jid);
  }

  // Pass 3 — VRN fallback, for a card created but never taken through SA intake
  // (so tbl_sa_intake has no row naming it). Strictly one candidate only.
  const vrnToJobId = new Map<string, number>();
  for (const c of cards) {
    const jid = Number(c.job_card_id);
    if (!Number.isFinite(jid) || resolved.has(jid)) continue;
    const vrn = normaliseVrn(c.vehicle_reg);
    // A card with no registration cannot be matched by registration, and one
    // registration can legitimately belong to two open cards — skip both.
    if (!vrn || vrnToJobId.has(vrn)) {
      vrnToJobId.set(vrn || `__dup_${jid}`, NaN);
      continue;
    }
    vrnToJobId.set(vrn, jid);
  }

  const candidatesByVrn = new Map<string, CustodyGateRow[]>();
  for (const g of gateRows) {
    const vrn = normaliseVrn(g.vin);
    if (!vrn) continue;
    if (!candidatesByVrn.has(vrn)) candidatesByVrn.set(vrn, []);
    candidatesByVrn.get(vrn)!.push(g);
  }

  for (const [vrn, jid] of vrnToJobId) {
    if (!Number.isFinite(jid)) continue;
    const candidates = candidatesByVrn.get(vrn) || [];
    const distinctGateEntries = new Set(
      candidates.map((c) => usableKey(c.gate_entry_id)).filter((v): v is string => v !== null)
    );
    // Ambiguous history -> resolve nothing and let the panel say "Not recorded".
    if (distinctGateEntries.size !== 1) continue;
    const match = candidates[0];
    addKey(match.gate_entry_id, jid);
    addKey(match.intake_id, jid);
    resolved.add(jid);
  }

  const unresolvedJobIds: number[] = [];
  for (const c of cards) {
    const jid = Number(c.job_card_id);
    if (Number.isFinite(jid) && !resolved.has(jid)) unresolvedJobIds.push(jid);
  }

  return { entityKeys, jobIdByEntity, unresolvedJobIds };
}

export interface CustodyHandoffRow {
  entity_id?: string | null;
  stage_name?: string | null;
  owner_role?: string | null;
  status?: string | null;
  sla_due_at?: unknown;
  opened_at?: unknown;
  escalation_level?: unknown;
}

/**
 * Apply handoff rows onto the per-card summaries.
 *
 * Rows arrive ordered by `opened_at` ASC, so the last write per card is the most
 * recent clock still in flight — that is who currently holds the vehicle.
 *
 * HONESTY RULE: when NO row could be matched for a card, `escalated` and
 * `breached` are set to null rather than false. `false` is a claim ("this is not
 * escalated") that the data does not support, and on a breached intake clock it
 * reads as reassurance exactly when the operator needs the opposite.
 * `holder_known` tells the UI which case it is looking at.
 */
export function mergeCustodyHandoffs(
  summaries: Record<string, any>,
  handoffRows: CustodyHandoffRow[],
  jobIdByEntity: Map<string, number>
): void {
  for (const k of Object.keys(summaries)) {
    summaries[k].holder_known = false;
    summaries[k].breached = null;
    summaries[k].escalated = null;
  }

  for (const r of handoffRows || []) {
    const jobId = jobIdByEntity.get(String(r.entity_id || "").toUpperCase());
    if (jobId === undefined) continue;
    const s = summaries[String(jobId)];
    if (!s) continue;

    s.holder = r.owner_role ?? null;
    s.holder_stage = r.stage_name ?? null;
    s.holder_since = r.opened_at ?? null;
    s.sla_due_at = r.sla_due_at ?? null;
    s.handoff_status = r.status ?? null;
    s.holder_known = true;
    // A matched row makes these genuine booleans: the clock is now visible, so
    // "no" is a supportable answer.
    s.breached = r.status === "BREACHED";
    s.escalated = Number(r.escalation_level || 0) > 0;
  }
}
