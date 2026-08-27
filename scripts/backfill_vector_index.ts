/**
 * =============================================================================
 * DWIP Enterprise — Vector Index Backfill
 *
 * Embeds the workshop's EXISTING closed history so SIGNA can retrieve from
 * semantic similarity on day one.
 *
 * Sources, in order:
 *   1. ai_brain_memory  — cases SIGNA already learned from closed job cards
 *   2. job_cards        — real job cards recorded in the workshop platform
 *   3. service_history  — the real historical service records (joined with vehicle_master)
 *
 * Safe to re-run. Rows already present in ai_vector_memory are excluded or updated in place.
 *
 * Usage:
 *   $env:GOOGLE_CLOUD_PROJECT="giga-course-dp497"; npx tsx scripts/backfill_vector_index.ts [--limit=2000] [--dry-run]
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

function safeSqlDate(dateVal: any): string | null {
  if (!dateVal) return null;
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace("T", " ");
    }
  } catch {}
  return null;
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
          occurredAt: safeSqlDate(r.created_at),
        } as VectorMetadata,
      }))
      .filter((c: Candidate) => c.text.length > 0);
  } catch (e: any) {
    console.warn(`  ai_brain_memory unavailable (${e.message}) — skipping.`);
    return [];
  }
}

async function collectFromJobCards(limit: number): Promise<Candidate[]> {
  try {
    const [rows]: any = await db.query(
      `SELECT j.job_id, j.job_card_no, j.vrn, j.vehicle_make, j.vehicle_model, 
              j.job_description, j.remarks, j.technician_name, j.status, j.created_at
       FROM job_cards j
       LEFT JOIN ai_vector_memory v ON v.vector_id = CONCAT('JC-', j.job_id)
       WHERE v.vector_id IS NULL
         AND (j.job_description IS NOT NULL AND j.job_description <> '')
       ORDER BY j.created_at DESC
       LIMIT ?`,
      [limit]
    );
    return (rows || [])
      .map((r: any) => {
        const model = [r.vehicle_make, r.vehicle_model].filter(Boolean).join(" ") || "Tata Vehicle";
        const textParts = [
          model,
          r.job_description ? `Complaint: ${r.job_description}` : "",
          r.remarks ? `Diagnosis: ${r.remarks}` : "",
          r.technician_name ? `Tech: ${r.technician_name}` : ""
        ].filter(Boolean).join(" — ").trim();

        return {
          id: `JC-${r.job_id}`,
          text: textParts,
          metadata: {
            vehicleModel: model,
            complaintText: r.job_description || "",
            diagnosis: r.remarks || r.job_description || "",
            outcome: r.status || "Closed",
            jobCardRef: r.job_card_no || String(r.job_id),
            sourceTable: "job_cards",
            occurredAt: safeSqlDate(r.created_at),
          } as VectorMetadata,
        };
      })
      .filter((c: Candidate) => c.text.length > 0);
  } catch (e: any) {
    console.warn(`  job_cards unavailable (${e.message}) — skipping.`);
    return [];
  }
}

async function collectFromServiceHistory(limit: number): Promise<Candidate[]> {
  try {
    const [rows]: any = await db.query(
      `SELECT s.sh_no, s.registration_no, s.chassis_no, s.summary, s.sr_type, 
              s.service_datetime, s.created_at,
              COALESCE(v.product_line, v.product_vc, 'Tata Commercial Vehicle') AS vehicle_model
       FROM service_history s
       LEFT JOIN vehicle_master v ON s.chassis_no = v.chassis_no COLLATE utf8mb4_unicode_ci
       LEFT JOIN ai_vector_memory vm ON vm.vector_id = CONCAT('SH-', s.sh_no) COLLATE utf8mb4_unicode_ci
       WHERE vm.vector_id IS NULL
         AND (
           (s.summary IS NOT NULL AND s.summary <> '') OR
           (s.sr_type IS NOT NULL AND s.sr_type <> '')
         )
       ORDER BY s.created_at DESC
       LIMIT ?`,
      [limit]
    );

    return (rows || [])
      .map((r: any) => {
        const textParts = [
          r.vehicle_model,
          r.sr_type ? `Type: ${r.sr_type}` : "",
          r.summary ? `Summary: ${r.summary}` : "",
          r.registration_no ? `VRN: ${r.registration_no}` : ""
        ].filter(Boolean).join(" — ").trim();

        return {
          id: `SH-${r.sh_no}`,
          text: textParts,
          metadata: {
            vehicleModel: r.vehicle_model || "Tata Commercial Vehicle",
            complaintText: r.summary || r.sr_type || "",
            diagnosis: r.summary || r.sr_type || "",
            outcome: "Closed (historical service record)",
            jobCardRef: r.sh_no ? String(r.sh_no) : null,
            sourceTable: "service_history",
            occurredAt: safeSqlDate(r.service_datetime || r.created_at),
          } as VectorMetadata,
        };
      })
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

  let remaining = Math.max(0, LIMIT - fromMemory.length);
  const fromJobCards = remaining > 0 ? await collectFromJobCards(remaining) : [];
  console.log(`  job_cards       : ${fromJobCards.length}`);

  remaining = Math.max(0, LIMIT - fromMemory.length - fromJobCards.length);
  const fromHistory = remaining > 0 ? await collectFromServiceHistory(remaining) : [];
  console.log(`  service_history : ${fromHistory.length}`);

  const candidates = [...fromMemory, ...fromJobCards, ...fromHistory];
  if (candidates.length === 0) {
    console.log("\nNothing to backfill — index is already current.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(`\n--dry-run: would embed and index ${candidates.length} cases. No writes made.`);
    process.exit(0);
  }

  console.log(`\nStarting embedding & indexing for ${candidates.length} cases in batches of ${BATCH_SIZE}...`);
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

    // Pacing delay to avoid Vertex per-minute rate limits
    if (done < candidates.length) {
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
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
