/**
 * =============================================================================
 * DWIP Enterprise Platform — Vertex AI Text Embedding Service
 * Bounded Context: AI Brains / Semantic Retrieval
 *
 * Generates dense vector embeddings for workshop complaint and diagnosis text
 * so SIGNA can retrieve semantically similar historical cases instead of
 * relying on SQL LIKE keyword overlap ("engine overheats" and "coolant temp
 * high" share no keyword but describe the same fault).
 *
 * ── AUTHENTICATION ──
 *
 * Vertex AI authenticates through Application Default Credentials (the Cloud
 * Run service account), NOT through GEMINI_API_KEY. This matters: the standing
 * instruction on this project is that GEMINI_API_KEY stays unconfigured in
 * production, and it was verified absent from the live service. Nothing here
 * reads or requires it. Locally, ADC comes from `gcloud auth application-default
 * login`.
 *
 * ── FAILURE POSTURE ──
 *
 * Every function fails SOFT, returning null rather than throwing. Embeddings
 * are a retrieval optimisation; if Vertex is unreachable, SIGNA must degrade to
 * the existing SQL search and still answer the technician, not error out.
 * =============================================================================
 */

import type { protos } from "@google-cloud/aiplatform";

/**
 * Dimensionality of the configured model's output.
 * text-embedding-005 and textembedding-gecko@003 both emit 768 dimensions. If
 * EMBEDDING_MODEL is changed to a different family, this must change with it —
 * a Matching Engine index is created with a fixed dimension count and rejects
 * vectors of any other length.
 */
export const EMBEDDING_DIMENSIONS = 768;

// Env-only by design. A hardcoded project fallback makes isEmbeddingConfigured()
// unconditionally true, so getActiveTier() reports SQL_VECTOR — and the
// /ai-brains/health endpoint reports healthy semantic retrieval — even when
// Vertex is entirely unreachable and answers are really coming from keyword
// search. That silent degradation is exactly what the tier field exists to
// expose. It also makes any non-production environment talk to the production
// GCP project instead of failing loudly on missing config.
const PROJECT_ID =
  process.env.VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
const LOCATION = process.env.VERTEX_LOCATION || "asia-south1";
const MODEL = process.env.EMBEDDING_MODEL || "text-embedding-005";

/**
 * Task type materially changes the vector Vertex returns. Indexed documents and
 * live queries must be embedded with the MATCHING pair below or similarity
 * scores are meaningless.
 */
export type EmbeddingTaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Vertex rejects oversized inputs; complaints are short, so truncation is safe. */
const MAX_INPUT_CHARS = 8000;

let predictionClient: any = null;
let clientInitFailed = false;

/**
 * Lazily constructs the Vertex client.
 *
 * Imported dynamically so that a deployment without @google-cloud/aiplatform
 * installed, or without ADC available, degrades to SQL retrieval instead of
 * crashing the server at boot. Once a failure is seen it is remembered, so a
 * misconfigured environment does not retry an expensive import per request.
 */
async function getPredictionClient(): Promise<any | null> {
  if (predictionClient) return predictionClient;
  if (clientInitFailed) return null;

  if (!PROJECT_ID) {
    console.warn(
      "[Embedding] VERTEX_PROJECT_ID / GOOGLE_CLOUD_PROJECT not set — semantic retrieval disabled, SQL fallback in use."
    );
    clientInitFailed = true;
    return null;
  }

  try {
    const aiplatform = await import("@google-cloud/aiplatform");
    const { PredictionServiceClient } = aiplatform.v1;
    predictionClient = new PredictionServiceClient({
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    });
    return predictionClient;
  } catch (err: any) {
    console.warn(
      `[Embedding] Vertex AI client unavailable (${err?.message || err}) — SQL fallback in use.`
    );
    clientInitFailed = true;
    return null;
  }
}

/** True when embeddings can be generated at all. Cheap; safe to call per request. */
export function isEmbeddingConfigured(): boolean {
  return Boolean(PROJECT_ID) && !clientInitFailed;
}

/**
 * Embeds a single string.
 * Returns null on any failure — callers must treat null as "fall back to SQL".
 */
export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTaskType = "RETRIEVAL_QUERY"
): Promise<number[] | null> {
  const cleaned = String(text || "").trim();
  if (!cleaned) return null;

  const client = await getPredictionClient();
  if (!client) return null;

  try {
    const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}`;
    const aiplatform = await import("@google-cloud/aiplatform");
    const { helpers } = aiplatform;

    const instance = helpers.toValue({
      content: cleaned.slice(0, MAX_INPUT_CHARS),
      task_type: taskType,
    }) as protos.google.protobuf.IValue;

    const [response]: any = await client.predict({
      endpoint,
      instances: [instance],
      parameters: helpers.toValue({ outputDimensionality: EMBEDDING_DIMENSIONS }),
    });

    const prediction = response?.predictions?.[0];
    if (!prediction) {
      console.warn("[Embedding] Vertex returned no prediction.");
      return null;
    }

    // Response shape: { embeddings: { values: [ ... ] } } wrapped in protobuf Values.
    const decoded: any = helpers.fromValue(prediction);
    const values: unknown = decoded?.embeddings?.values ?? decoded?.values;

    if (!Array.isArray(values) || values.length === 0) {
      console.warn("[Embedding] Vertex prediction contained no embedding values.");
      return null;
    }

    const vector = values.map((v: any) => Number(v));
    if (vector.some((v) => !Number.isFinite(v))) {
      console.warn("[Embedding] Discarding embedding containing non-finite values.");
      return null;
    }

    if (vector.length !== EMBEDDING_DIMENSIONS) {
      // Loud, because it means the model and the index disagree and every
      // upsert will be rejected downstream.
      console.error(
        `[Embedding] Dimension mismatch: model "${MODEL}" returned ${vector.length}, ` +
          `index expects ${EMBEDDING_DIMENSIONS}. Check EMBEDDING_MODEL against the deployed index.`
      );
      return null;
    }

    return vector;
  } catch (err: any) {
    // Message only. Vertex errors can echo request metadata, and the input is
    // customer complaint text that must not be written to logs.
    console.warn(`[Embedding] Generation failed: ${err?.message || "unknown error"}`);
    return null;
  }
}

/**
 * Embeds several strings in one round trip, for backfill jobs.
 * Returns a parallel array; individual entries are null where embedding failed,
 * so callers can skip those rather than losing the whole batch.
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  taskType: EmbeddingTaskType = "RETRIEVAL_DOCUMENT",
  maxRetries: number = 3
): Promise<Array<number[] | null>> {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const client = await getPredictionClient();
  if (!client) return texts.map(() => null);

  const aiplatform = await import("@google-cloud/aiplatform");
  const { helpers } = aiplatform;
  const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}`;

  const instances = texts.map((t) =>
    helpers.toValue({
      content: String(t || "").trim().slice(0, MAX_INPUT_CHARS),
      task_type: taskType,
    })
  );

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const [response]: any = await client.predict({
        endpoint,
        instances,
        parameters: helpers.toValue({ outputDimensionality: EMBEDDING_DIMENSIONS }),
      });

      return texts.map((_, i) => {
        const prediction = response?.predictions?.[i];
        if (!prediction) return null;
        const decoded: any = helpers.fromValue(prediction);
        const values: unknown = decoded?.embeddings?.values ?? decoded?.values;
        if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) return null;
        const vector = values.map((v: any) => Number(v));
        return vector.some((v) => !Number.isFinite(v)) ? null : vector;
      });
    } catch (err: any) {
      const isQuota = String(err?.message || "").includes("RESOURCE_EXHAUSTED") || err?.code === 8;
      if (isQuota && attempt < maxRetries) {
        const backoffMs = attempt * 2500;
        console.warn(`[Embedding] Quota reached, retrying batch in ${backoffMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      console.warn(`[Embedding] Batch generation failed (attempt ${attempt}): ${err?.message || "unknown error"}`);
      if (attempt === maxRetries) {
        return texts.map(() => null);
      }
    }
  }

  return texts.map(() => null);
}

/**
 * Cosine similarity, used to re-rank hydrated results and to power the
 * in-database brute-force path when no Matching Engine endpoint is deployed.
 * Returns 0 for mismatched or degenerate vectors rather than NaN.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  const score = dot / (Math.sqrt(magA) * Math.sqrt(magB));
  return Number.isFinite(score) ? score : 0;
}
