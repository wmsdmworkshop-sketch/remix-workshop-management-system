/**
 * =============================================================================
 * DWIP Enterprise Platform — Vector Index Service (Vertex AI Matching Engine)
 * Bounded Context: AI Brains / Semantic Retrieval
 *
 * Stores and searches embeddings of real, closed workshop cases so SIGNA can
 * ground its answer in semantically similar history rather than keyword overlap.
 *
 * ── WHY THERE ARE THREE TIERS ──
 *
 * Vertex AI Matching Engine bills for a DEPLOYED INDEX ENDPOINT by the hour,
 * whether or not it is queried — an always-on cost in the hundreds of dollars a
 * month. For a single dealership whose corpus is a few thousand closed job
 * cards, an exhaustive cosine scan in MySQL answers in single-digit milliseconds
 * and costs nothing. Forcing Matching Engine on that data volume would be a
 * large recurring bill for no measurable retrieval gain.
 *
 * So retrieval degrades deliberately:
 *
 *   1. MATCHING_ENGINE — used when an index endpoint is configured. Correct
 *      choice at large corpus sizes or across many dealerships.
 *   2. SQL_VECTOR     — exhaustive cosine over embeddings held in MySQL. Same
 *      semantic quality as tier 1 at this data volume, no standing cost, and it
 *      survives Cloud Run's ephemeral disk because the vectors live in the
 *      database. This is the tier that replaces SQL LIKE by default.
 *   3. SQL_LIKE       — the pre-existing keyword search. Last resort when no
 *      embeddings exist yet (cold start, or Vertex unreachable).
 *
 * Tier 2 is what makes this work without ChromaDB and without a standing spend
 * commitment. Set VERTEX_INDEX_ENDPOINT_ID to promote to tier 1 at any time; no
 * code change is required and the stored vectors are reused as-is.
 *
 * ── WHY METADATA LIVES IN MYSQL ──
 *
 * Matching Engine returns datapoint IDs and distances only — it does not store
 * or return payloads. The case text must therefore be held alongside the vector
 * in MySQL and hydrated after the ID lookup. That same table is what tier 2
 * scans directly.
 * =============================================================================
 */

import { pool as db } from "../db/index.ts";
import {
  EMBEDDING_DIMENSIONS,
  cosineSimilarity,
  isEmbeddingConfigured,
} from "./embedding.service.ts";

const PROJECT_ID =
  process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
const LOCATION = process.env.VERTEX_LOCATION || "asia-south1";
const INDEX_ID = process.env.VERTEX_INDEX_ID || "";
const INDEX_ENDPOINT_ID = process.env.VERTEX_INDEX_ENDPOINT_ID || "";
const DEPLOYED_INDEX_ID = process.env.VERTEX_DEPLOYED_INDEX_ID || "";

export type RetrievalTier = "MATCHING_ENGINE" | "SQL_VECTOR" | "SQL_LIKE" | "NONE";

export interface VectorMetadata {
  vehicleModel: string;
  complaintText: string;
  diagnosis: string;
  outcome: string;
  jobCardRef: string | null;
  sourceTable: string;
  occurredAt: string | null;
}

export interface VectorSearchHit {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

let schemaReady: Promise<void> | null = null;
let matchClient: any = null;
let indexClient: any = null;
let vertexInitFailed = false;

/**
 * Creates the metadata/vector table on first use.
 *
 * Done defensively at runtime because this codebase has no migration runner and
 * several live tables (gm_override_log, tbl_gate_reentry_requests) are created
 * the same way at startup. Idempotent, and memoised so concurrent callers share
 * one attempt.
 *
 * The embedding is stored as JSON rather than a MySQL 9 VECTOR column because
 * the production instance is MySQL 8, which has no native vector type.
 */
function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_vector_memory (
        vector_id      VARCHAR(128) NOT NULL PRIMARY KEY,
        vehicle_model  VARCHAR(191) NULL,
        complaint_text TEXT NULL,
        diagnosis      TEXT NULL,
        outcome        VARCHAR(191) NULL,
        job_card_ref   VARCHAR(64) NULL,
        source_table   VARCHAR(64) NOT NULL DEFAULT 'job_cards',
        occurred_at    DATETIME NULL,
        embedding      JSON NULL,
        dimensions     SMALLINT UNSIGNED NULL,
        indexed_remote TINYINT(1) NOT NULL DEFAULT 0,
        created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vehicle_model (vehicle_model),
        INDEX idx_indexed_remote (indexed_remote),
        INDEX idx_occurred_at (occurred_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  })().catch((err: any) => {
    // Reset so a transient DDL failure can be retried on the next call.
    schemaReady = null;
    console.warn(`[VectorIndex] Schema init failed: ${err?.message || err}`);
    throw err;
  });
  return schemaReady;
}

/** True when a Matching Engine endpoint is fully configured (tier 1 available). */
export function isMatchingEngineConfigured(): boolean {
  return Boolean(PROJECT_ID && INDEX_ENDPOINT_ID && DEPLOYED_INDEX_ID) && !vertexInitFailed;
}

/** Which tier will actually serve a query, given current configuration. */
export function getActiveTier(): RetrievalTier {
  if (isMatchingEngineConfigured()) return "MATCHING_ENGINE";
  if (isEmbeddingConfigured()) return "SQL_VECTOR";
  return "SQL_LIKE";
}

async function getMatchClient(): Promise<any | null> {
  if (matchClient) return matchClient;
  if (vertexInitFailed || !isMatchingEngineConfigured()) return null;
  try {
    const aiplatform = await import("@google-cloud/aiplatform");
    const { MatchServiceClient } = aiplatform.v1;
    // Matching Engine queries go to the endpoint's own public domain, not the
    // regional aiplatform host. Using the regional host returns NOT_FOUND.
    const host =
      process.env.VERTEX_INDEX_ENDPOINT_DOMAIN ||
      `${LOCATION}-aiplatform.googleapis.com`;
    matchClient = new MatchServiceClient({ apiEndpoint: host });
    return matchClient;
  } catch (err: any) {
    console.warn(`[VectorIndex] MatchServiceClient unavailable: ${err?.message || err}`);
    vertexInitFailed = true;
    return null;
  }
}

async function getIndexClient(): Promise<any | null> {
  if (indexClient) return indexClient;
  if (vertexInitFailed || !PROJECT_ID || !INDEX_ID) return null;
  try {
    const aiplatform = await import("@google-cloud/aiplatform");
    const { IndexServiceClient } = aiplatform.v1;
    indexClient = new IndexServiceClient({
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    });
    return indexClient;
  } catch (err: any) {
    console.warn(`[VectorIndex] IndexServiceClient unavailable: ${err?.message || err}`);
    return null;
  }
}

/**
 * Persists a vector plus its metadata, and mirrors it into Matching Engine when
 * that tier is configured.
 *
 * MySQL is written FIRST and is the source of truth. If the remote upsert fails
 * the row still exists and still serves tier 2, and `indexed_remote` stays 0 so
 * a later backfill can retry it. Losing a learned case because a remote call
 * timed out would be the worse outcome.
 */
export async function insertVector(
  id: string,
  embedding: number[],
  metadata: VectorMetadata
): Promise<boolean> {
  if (!id || !Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    console.warn(
      `[VectorIndex] Refusing to insert "${id}": expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 0}.`
    );
    return false;
  }

  try {
    await ensureSchema();
    await db.execute(
      `INSERT INTO ai_vector_memory
         (vector_id, vehicle_model, complaint_text, diagnosis, outcome,
          job_card_ref, source_table, occurred_at, embedding, dimensions, indexed_remote)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, 0)
       ON DUPLICATE KEY UPDATE
         vehicle_model  = VALUES(vehicle_model),
         complaint_text = VALUES(complaint_text),
         diagnosis      = VALUES(diagnosis),
         outcome        = VALUES(outcome),
         embedding      = VALUES(embedding),
         dimensions     = VALUES(dimensions)`,
      [
        id,
        metadata.vehicleModel || null,
        metadata.complaintText || null,
        metadata.diagnosis || null,
        metadata.outcome || null,
        metadata.jobCardRef || null,
        metadata.sourceTable || "job_cards",
        metadata.occurredAt || null,
        JSON.stringify(embedding),
        embedding.length,
      ]
    );
  } catch (err: any) {
    console.warn(`[VectorIndex] Local persist failed for "${id}": ${err?.message || err}`);
    return false;
  }

  if (isMatchingEngineConfigured()) {
    try {
      const client = await getIndexClient();
      if (client) {
        await client.upsertDatapoints({
          index: `projects/${PROJECT_ID}/locations/${LOCATION}/indexes/${INDEX_ID}`,
          datapoints: [{ datapointId: id, featureVector: embedding }],
        });
        await db.execute(
          `UPDATE ai_vector_memory SET indexed_remote = 1 WHERE vector_id = ?`,
          [id]
        );
      }
    } catch (err: any) {
      // Non-fatal by design — tier 2 still serves this row.
      console.warn(`[VectorIndex] Remote upsert failed for "${id}": ${err?.message || err}`);
    }
  }

  return true;
}

/** Hydrates full case metadata for datapoint IDs returned by Matching Engine. */
async function hydrateByIds(ids: string[]): Promise<Map<string, VectorMetadata>> {
  const map = new Map<string, VectorMetadata>();
  if (ids.length === 0) return map;

  const placeholders = ids.map(() => "?").join(",");
  const [rows]: any = await db.query(
    `SELECT vector_id, vehicle_model, complaint_text, diagnosis, outcome,
            job_card_ref, source_table, occurred_at
     FROM ai_vector_memory WHERE vector_id IN (${placeholders})`,
    ids
  );

  for (const r of rows || []) {
    map.set(r.vector_id, {
      vehicleModel: r.vehicle_model || "",
      complaintText: r.complaint_text || "",
      diagnosis: r.diagnosis || "",
      outcome: r.outcome || "Unknown",
      jobCardRef: r.job_card_ref || null,
      sourceTable: r.source_table || "job_cards",
      occurredAt: r.occurred_at ? new Date(r.occurred_at).toISOString().slice(0, 10) : null,
    });
  }
  return map;
}

/**
 * Returns the nearest stored cases to `embedding`.
 *
 * Empty array means "no semantic match" and is a valid answer — the caller is
 * expected to fall back to SQL LIKE rather than treat it as an error. Optionally
 * restricts to a vehicle model, since a Signa fault is rarely evidence about an Ace.
 */
export async function searchSimilar(
  embedding: number[],
  topK: number = 3,
  vehicleModel?: string
): Promise<VectorSearchHit[]> {
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) return [];
  const limit = Math.max(1, Math.min(50, topK));

  try {
    await ensureSchema();
  } catch {
    return [];
  }

  // ── Tier 1: Matching Engine ──
  if (isMatchingEngineConfigured()) {
    try {
      const client = await getMatchClient();
      if (client) {
        const [response]: any = await client.findNeighbors({
          indexEndpoint: `projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}`,
          deployedIndexId: DEPLOYED_INDEX_ID,
          queries: [{ datapoint: { featureVector: embedding }, neighborCount: limit }],
        });

        const neighbors = response?.nearestNeighbors?.[0]?.neighbors || [];
        if (neighbors.length > 0) {
          const ids = neighbors
            .map((n: any) => n?.datapoint?.datapointId)
            .filter((v: any): v is string => typeof v === "string" && v.length > 0);

          const hydrated = await hydrateByIds(ids);
          const hits: VectorSearchHit[] = [];

          for (const n of neighbors) {
            const id = n?.datapoint?.datapointId;
            const metadata = id ? hydrated.get(id) : undefined;
            if (!id || !metadata) continue;
            if (vehicleModel && metadata.vehicleModel &&
                !metadata.vehicleModel.toLowerCase().includes(vehicleModel.toLowerCase())) {
              continue;
            }
            // Matching Engine reports distance; convert to a similarity score so
            // callers see one consistent "higher is better" scale across tiers.
            const distance = Number(n?.distance);
            hits.push({
              id,
              score: Number.isFinite(distance) ? 1 / (1 + Math.max(0, distance)) : 0,
              metadata,
            });
          }

          if (hits.length > 0) return hits.slice(0, limit);
        }
        // Fall through to tier 2 when the endpoint returns nothing usable —
        // e.g. datapoints upserted but not yet built into the served index.
      }
    } catch (err: any) {
      console.warn(`[VectorIndex] Matching Engine query failed, falling back: ${err?.message || err}`);
    }
  }

  // ── Tier 2: exhaustive cosine over MySQL-held vectors ──
  try {
    const params: any[] = [];
    let where = "WHERE embedding IS NOT NULL AND dimensions = ?";
    params.push(EMBEDDING_DIMENSIONS);
    if (vehicleModel) {
      where += " AND vehicle_model LIKE ?";
      params.push(`%${vehicleModel}%`);
    }

    // Bounded so a large corpus cannot pull unlimited rows into memory. Newest
    // first, because recent cases reflect current parts and current procedures.
    const [rows]: any = await db.query(
      `SELECT vector_id, vehicle_model, complaint_text, diagnosis, outcome,
              job_card_ref, source_table, occurred_at, embedding
       FROM ai_vector_memory
       ${where}
       ORDER BY occurred_at DESC, created_at DESC
       LIMIT 5000`,
      params
    );

    const scored: VectorSearchHit[] = [];
    for (const r of rows || []) {
      let vector: number[] | null = null;
      try {
        // mysql2 may hand back JSON already parsed or as a string.
        vector = typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding;
      } catch {
        continue;
      }
      if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) continue;

      const score = cosineSimilarity(embedding, vector);
      if (score <= 0) continue;

      scored.push({
        id: r.vector_id,
        score,
        metadata: {
          vehicleModel: r.vehicle_model || "",
          complaintText: r.complaint_text || "",
          diagnosis: r.diagnosis || "",
          outcome: r.outcome || "Unknown",
          jobCardRef: r.job_card_ref || null,
          sourceTable: r.source_table || "job_cards",
          occurredAt: r.occurred_at ? new Date(r.occurred_at).toISOString().slice(0, 10) : null,
        },
      });
    }

    scored.sort((a, b) => b.score - a.score);

    // Weak matches are worse than none: they pad the prompt with unrelated
    // cases and invite the model to draw a false parallel. Below this the
    // caller should prefer SQL LIKE or an explicit "no history found".
    const MIN_SIMILARITY = 0.55;
    return scored.filter((h) => h.score >= MIN_SIMILARITY).slice(0, limit);
  } catch (err: any) {
    console.warn(`[VectorIndex] SQL vector search failed: ${err?.message || err}`);
    return [];
  }
}

/** Rows awaiting a remote upsert, for the backfill script. */
export async function getPendingRemoteUpserts(limit: number = 500): Promise<
  Array<{ id: string; embedding: number[] }>
> {
  try {
    await ensureSchema();
    const [rows]: any = await db.query(
      `SELECT vector_id, embedding FROM ai_vector_memory
       WHERE indexed_remote = 0 AND embedding IS NOT NULL AND dimensions = ?
       LIMIT ?`,
      [EMBEDDING_DIMENSIONS, limit]
    );
    const out: Array<{ id: string; embedding: number[] }> = [];
    for (const r of rows || []) {
      try {
        const vector = typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding;
        if (Array.isArray(vector) && vector.length === EMBEDDING_DIMENSIONS) {
          out.push({ id: r.vector_id, embedding: vector });
        }
      } catch {
        /* skip malformed row */
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Corpus size and tier, for the AI Brains health panel. */
export async function getIndexStats(): Promise<{
  tier: RetrievalTier;
  totalVectors: number;
  pendingRemote: number;
}> {
  try {
    await ensureSchema();
    const [rows]: any = await db.query(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN indexed_remote = 0 THEN 1 ELSE 0 END) AS pending
       FROM ai_vector_memory WHERE embedding IS NOT NULL`
    );
    return {
      tier: getActiveTier(),
      totalVectors: Number(rows?.[0]?.total || 0),
      pendingRemote: Number(rows?.[0]?.pending || 0),
    };
  } catch {
    return { tier: getActiveTier(), totalVectors: 0, pendingRemote: 0 };
  }
}
