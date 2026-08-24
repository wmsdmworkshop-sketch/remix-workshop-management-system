/**
 * =============================================================================
 * DWIP Enterprise Platform — SETU (Coordination Brain, L2)
 * Bounded Context: AI Brains / Cross-Desk Bottleneck Detection
 * Description: Cross-references the REAL current Parts, Warranty, and SA-
 *              assignment queues to spot jobs stuck across multiple sequential
 *              handoffs at once — the actual root cause of the 2-4 hour delays
 *              described in the AI Brains spec. Observation-only: it reports
 *              what it sees, it does not reassign or auto-act on anything.
 * =============================================================================
 */
import { pool as db } from "../../db/index.ts";
import { PartsWarrantyEngine } from "../../core/workshop/parts-warranty-engine.ts";
import { RealtimeOwnershipPipeline } from "../../core/workshop/realtime-ownership-pipeline.ts";
import { DeepSeekEngine } from "../deepseek-engine.ts";
import { recordBrainInvocation, recordBrainError } from "./brain-registry.ts";

const BRAIN_ID = "SETU";
const DEFAULT_BRANCH_ID = "BR-SEDAM";

export interface CoordinationSnapshot {
  partsPendingCount: number;
  warrantyPendingCount: number;
  saAssignmentPendingCount: number;
  stuckAcrossMultipleQueues: Array<{ jobCardRef: string; stuckIn: string[] }>;
  longestWaitMins: { queue: string; jobCardRef: string; waitMins: number } | null;
  summary: string;
}

function minutesSince(dateVal: any): number {
  if (!dateVal) return 0;
  const t = new Date(dateVal).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 60000);
}

export async function observeCoordinationState(triggeredBy: string, branchId: string = DEFAULT_BRANCH_ID): Promise<CoordinationSnapshot> {
  const startedAt = Date.now();
  try {
    const engine = PartsWarrantyEngine.getInstance();
    const [partsQueue, warrantyQueue, saQueue]: [any[], any[], any[]] = await Promise.all([
      engine.getPartsQueue(branchId).catch(() => []),
      engine.getWarrantyQueue(branchId).catch(() => []),
      RealtimeOwnershipPipeline.getManagerPendingQueue(branchId).catch(() => []),
    ]);

    // Cross-reference: same job card waiting in more than one queue at once.
    const byJobCard = new Map<string, string[]>();
    for (const p of partsQueue) {
      const ref = p.job_card_id;
      if (!ref) continue;
      byJobCard.set(ref, [...(byJobCard.get(ref) || []), "Parts"]);
    }
    for (const w of warrantyQueue) {
      const ref = w.job_card_id;
      if (!ref) continue;
      byJobCard.set(ref, [...(byJobCard.get(ref) || []), "Warranty"]);
    }
    const stuckAcrossMultipleQueues = Array.from(byJobCard.entries())
      .filter(([, queues]) => queues.length > 1)
      .map(([jobCardRef, stuckIn]) => ({ jobCardRef, stuckIn }));

    // Longest single wait across all three queues.
    let longestWaitMins: CoordinationSnapshot["longestWaitMins"] = null;
    const candidates = [
      ...partsQueue.map((p: any) => ({ queue: "Parts", jobCardRef: p.job_card_id, waitMins: minutesSince(p.requested_at) })),
      ...warrantyQueue.map((w: any) => ({ queue: "Warranty", jobCardRef: w.job_card_id, waitMins: minutesSince(w.requested_at) })),
      ...saQueue.map((s: any) => ({ queue: "SA Assignment", jobCardRef: s.intakeId, waitMins: s.waitingMins || 0 })),
    ];
    for (const c of candidates) {
      if (!longestWaitMins || c.waitMins > longestWaitMins.waitMins) longestWaitMins = c;
    }

    const snapshot: CoordinationSnapshot = {
      partsPendingCount: partsQueue.length,
      warrantyPendingCount: warrantyQueue.length,
      saAssignmentPendingCount: saQueue.length,
      stuckAcrossMultipleQueues,
      longestWaitMins,
      summary: "",
    };

    // Ask DeepSeek to phrase a short human-readable note from the REAL computed
    // numbers above — it is not given anything it could use to invent numbers.
    try {
      const raw = await DeepSeekEngine.chat(
        [
          {
            role: "system",
            content: "You are SETU, the Coordination Brain of a Tata Motors commercial vehicle workshop. " +
              "You are given real, already-computed queue counts and wait times. Write ONE short plain-language " +
              "sentence flagging the most important bottleneck right now, or state clearly that queues are healthy " +
              "if nothing is stuck. Do not invent any number not given to you.",
          },
          { role: "user", content: JSON.stringify({ ...snapshot, summary: undefined }) },
        ],
        { model: "deepseek-chat", temperature: 0.1, maxTokens: 150 }
      );
      snapshot.summary = raw.trim();
    } catch {
      snapshot.summary = stuckAcrossMultipleQueues.length > 0
        ? `${stuckAcrossMultipleQueues.length} job card(s) stuck across multiple handoffs.`
        : "Queues observed; no cross-queue bottleneck detected.";
    }

    await recordBrainInvocation(BRAIN_ID, {
      triggeredBy,
      inputSummary: `Parts:${snapshot.partsPendingCount} Warranty:${snapshot.warrantyPendingCount} SA:${snapshot.saAssignmentPendingCount}`,
      outputSummary: snapshot.summary.slice(0, 500),
      durationMs: Date.now() - startedAt,
    });

    return snapshot;
  } catch (err: any) {
    await recordBrainError(BRAIN_ID, err.message, triggeredBy, Date.now() - startedAt);
    throw err;
  }
}
