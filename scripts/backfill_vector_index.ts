/**
 * =============================================================================
 * DWIP Enterprise — Vector Index Backfill
 *
 * Embeds the workshop's EXISTING closed history so SIGNA has something to
 * retrieve from on day one. Without this the semantic index is empty and every
 * lookup silently falls through to keyword matching until enough new job cards
 * close to fill it — which for a single dealership is months.
 *
 * Sources, in order:
 *   1. ai_brain_memory  — cases SIGNA already learned from closed job cards
 *   2. service_history  — the real historical service records
 *
 * Safe to re-run. Rows already present are updated in place (upsert by ID), so
 * an interrupted run can simply be started again.
 *
 * Usage:
 *   npx dotenv -e .env -- npx tsx scripts/backfill_vector_index.ts [--limit=2000] [--dry-run]
 * =============================================================================
 */

import { pool as db } from "../src/db/index.ts";
import { generateEmbeddingsBatch, isEmbeddingConfigured } from "../src/services/embedding.service.ts";
import { insertVector, getIndexStats, type VectorMetadata } from "../src/services/vector-index.service.ts";

/** Vertex caps instances per predict call; stay comfortably under it. */
const BATCH_SIZE = 25;

function parseArg(name: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.split("=")[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const LIMIT = parseArg("limit", 2000);
const DRY_RUN = process.argv.includes("--dry-run");

interface Candidate {
  id: string;
  text: string;
  metadata: VectorMetadata;
}

async function collectFromBrainMemory(limit: number): Promise<Candidate[]> {
  try {
    const [rows]: any = await db.query(
      `SELECT m.memory_id, m.vehicle_model, m.complaint_text, m.diagnosis,
              m.outcome, m.job_card_ref, m.created_at
       FROM ai_brain_memory m
       LEFT JOIN ai_vector_memory v ON v.vector_id = m.memory_id
       WHERE v.vector_id IS NULL
       ORDER BY m.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return (rows || [])
      .map((r: any) => ({
        id: r.memory_id,
        text: [r.vehicle_model, r.complaint_text, r.diagnosis].filter(Boolean).join(" — ").trim(),
        metadata: {
          vehicleModel: r.vehicle_model || "",
          complaintText: r.complaint_text || "",
          diagnosis: r.diagnosis || "",
          outcome: r.outcome || "Completed",
          jobCardRef: r.job_card_ref || null,
          sourceTable: "ai_brain_memory",
          occurredAt: r.created_at
            ? new Date(r.created_at).toISOString().slice(0, 19).replace("T", " ")
            : null,
        } as VectorMetadata,
      }))
      .filter((c: Candidate) => c.text.length > 0);
  } catch (e: any) {
    console.warn(`  ai_brain_memory unavailable (${e.message}) — skipping.`);
    return [];
  }
}

async function collectFromServiceHistory(limit: number): Promise<Candidate[]> {
  try {
    const [rows]: any = await db.query(
      `SELECT s.sh_no, s.summary, s.sr_type, s.service_datetime, s.model
       FROM service_history s
       LEFT JOIN ai_vector_memory v ON v.vector_id = CONCAT('SH-', s.sh_no)
       WHERE v.vector_id IS NULL
         AND s.summary IS NOT NULL AND s.summary <> ''
       ORDER BY s.service_datetime DESC
       LIMIT ?`,
      [limit]
    );
    return (rows || [])
      .map((r: any) => ({
        id: `SH-${r.sh_no}`,
        text: [r.model, r.sr_type, r.summary].filter(Boolean).join(" — ").trim(),
        metadata: {
          vehicleModel: r.model || "",
          complaintText: r.summary || "",
          diagnosis: r.summary || "",
          outcome: "Closed (historical service record)",
          jobCardRef: r.sh_no ? String(r.sh_no) : null,
          sourceTable: "service_history",
          occurredAt: r.service_datetime
            ? new Date(r.service_datetime).toISOString().slice(0, 19).replace("T", " ")
            : null,
        } as VectorMetadata,
      }))
      .filter((c: Candidate) => c.text.length > 0);
  } catch (e: any) {
    console.warn(`  service_history unavailable (${e.message}) — skipping.`);
    return [];
  }
}

async function main() {
  console.log("DWIP — Vector index backfill\n");

  if (!isEmbeddingConfigured()) {
    console.error(
      "VERTEX_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) is not set. Nothing to do.\n" +
        "Set it, ensure Application Default Credentials are available, and re-run."
    );
    process.exit(1);
  }

  const before = await getIndexStats();
  console.log(`Active retrieval tier : ${before.tier}`);
  console.log(`Vectors already stored: ${before.totalVectors}\n`);

  console.log("Collecting un-indexed cases...");
  const fromMemory = await collectFromBrainMemory(LIMIT);
  console.log(`  ai_brain_memory : ${fromMemory.length}`);
  const remaining = Math.max(0, LIMIT - fromMemory.length);
  const fromHistory = remaining > 0 ? await collectFromServiceHistory(remaining) : [];
  console.log(`  service_history : ${fromHistory.length}`);

  const candidates = [...fromMemory, ...fromHistory];
  if (candidates.length === 0) {
    console.log("\nNothing to backfill — index is already current.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(`\n--dry-run: would embed and index ${candidates.length} cases. No writes made.`);
    process.exit(0);
  }

  let indexed = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    const embeddings = await generateEmbeddingsBatch(
      batch.map((c) => c.text),
      "RETRIEVAL_DOCUMENT"
    );

    for (let j = 0; j < batch.length; j++) {
      const embedding = embeddings[j];
      if (!embedding) {
        failed++;
        continue;
      }
      const ok = await insertVector(batch[j].id, embedding, batch[j].metadata);
      if (ok) indexed++;
      else failed++;
    }

    const done = Math.min(i + BATCH_SIZE, candidates.length);
    console.log(`  ${done}/${candidates.length} processed (indexed ${indexed}, failed ${failed})`);
  }

  const after = await getIndexStats();
  console.log(`\nDone. Indexed ${indexed}, failed ${failed}.`);
  console.log(`Vectors now stored : ${after.totalVectors}`);
  if (after.pendingRemote > 0) {
    console.log(
      `Awaiting Matching Engine upsert: ${after.pendingRemote} ` +
        `(expected when running on the SQL_VECTOR tier — no action needed).`
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill failed:", err?.message || err);
  process.exit(1);
});
