/**
 * =============================================================================
 * DWIP Enterprise Platform — SIGNA (Tactical Brain, L1)
 * Bounded Context: AI Brains / Real-Time Technician Assistance
 * Description: Suggests a diagnosis, likely parts, and warranty posture for a
 *              technician's complaint by grounding DeepSeek reasoning in real
 *              historical cases (service_history + its own learned memory),
 *              never fabricated ones. Learns passively from real completed
 *              job cards — no vector DB; SQL-based similarity on the existing
 *              MySQL store.
 * =============================================================================
 */
import { pool as db } from "../../db/index.ts";
import crypto from "crypto";
import { DeepSeekEngine } from "../deepseek-engine.ts";
import { recordBrainInvocation, recordBrainError } from "./brain-registry.ts";

export interface TacticalSuggestion {
  recommendedAction: string;
  rootCauseProbability: Array<{ cause: string; probability: number }>;
  historicalReference: Array<{ reference: string; date: string; outcome: string }>;
  confidence: "LOW" | "MEDIUM" | "HIGH";
}

const BRAIN_ID = "SIGNA";

// Extracts a handful of meaningful keywords from a free-text complaint for
// SQL LIKE matching. Deliberately simple — no NLP dependency, just enough to
// find genuinely related historical cases.
function extractKeywords(complaint: string): string[] {
  const stopwords = new Set(["the", "and", "for", "with", "from", "this", "that", "have", "has", "not", "issue", "problem"]);
  return complaint
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w))
    .slice(0, 5);
}

interface HistoricalCase {
  reference: string;
  date: string;
  summary: string;
  outcome: string;
}

async function findSimilarCases(vehicleModel: string, complaint: string): Promise<HistoricalCase[]> {
  const keywords = extractKeywords(complaint);
  const cases: HistoricalCase[] = [];

  // 1. Own learned memory (grows over time from real closed job cards)
  try {
    const likeClauses = keywords.map(() => "(complaint_text LIKE ? OR diagnosis LIKE ?)").join(" OR ");
    const likeParams = keywords.flatMap((k) => [`%${k}%`, `%${k}%`]);
    if (keywords.length > 0) {
      const [rows]: any = await db.query(
        `SELECT job_card_ref, diagnosis, outcome, created_at FROM ai_brain_memory
         WHERE vehicle_model LIKE ? AND (${likeClauses})
         ORDER BY created_at DESC LIMIT 3`,
        [`%${vehicleModel}%`, ...likeParams]
      );
      for (const r of rows) {
        cases.push({
          reference: r.job_card_ref || "internal-memory",
          date: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : "",
          summary: r.diagnosis || "",
          outcome: r.outcome || "Unknown",
        });
      }
    }
  } catch (e: any) {
    console.warn("SIGNA: memory lookup failed:", e.message);
  }

  // 2. Real historical service_history (already populated, 9000+ real records)
  if (cases.length < 3 && keywords.length > 0) {
    try {
      const likeClauses = keywords.map(() => "summary LIKE ?").join(" OR ");
      const likeParams = keywords.map((k) => `%${k}%`);
      const [rows]: any = await db.query(
        `SELECT sh_no, summary, sr_type, service_datetime FROM service_history
         WHERE (${likeClauses})
         ORDER BY service_datetime DESC LIMIT ${3 - cases.length}`,
        likeParams
      );
      for (const r of rows) {
        cases.push({
          reference: r.sh_no || "service-history",
          date: r.service_datetime ? String(r.service_datetime).slice(0, 10) : "",
          summary: r.summary || r.sr_type || "",
          outcome: "Closed (historical service record)",
        });
      }
    } catch (e: any) {
      console.warn("SIGNA: service_history lookup failed:", e.message);
    }
  }

  return cases;
}

const SIGNA_SYSTEM_PROMPT = `You are SIGNA, the Tactical Brain of DWIP Enterprise — a senior Tata Motors Commercial Vehicle master technician's assistant.
Your job is to help the current technician diagnose an issue fast, using ONLY the real historical cases given to you in the user message.
STRICT RULES:
1. NEVER invent a historical case that was not given to you. If no historical cases are provided, say so plainly and give general BS6 commercial-vehicle diagnostic guidance instead, clearly labeled as general guidance, not case-based.
2. Do not claim parts are in stock or a warranty is approved — you have no live access to those systems in this response; a human confirms them separately.
3. Return ONLY a valid JSON object with this exact schema, nothing else:
{"recommendedAction": string, "rootCauseProbability": [{"cause": string, "probability": number between 0 and 1}], "confidence": "LOW"|"MEDIUM"|"HIGH"}`;

export async function getTacticalSuggestion(
  vehicleModel: string,
  complaint: string,
  triggeredBy: string
): Promise<TacticalSuggestion> {
  const startedAt = Date.now();
  try {
    const historicalCases = await findSimilarCases(vehicleModel, complaint);

    const userMessage = historicalCases.length > 0
      ? `Vehicle: ${vehicleModel}\nComplaint: "${complaint}"\n\nReal historical cases found:\n` +
        historicalCases.map((c, i) => `${i + 1}. [${c.date}] ${c.reference}: ${c.summary} (Outcome: ${c.outcome})`).join("\n")
      : `Vehicle: ${vehicleModel}\nComplaint: "${complaint}"\n\nNo matching historical cases were found in workshop records. Provide general BS6 commercial vehicle diagnostic guidance only.`;

    const raw = await DeepSeekEngine.chat(
      [
        { role: "system", content: SIGNA_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      { model: "deepseek-chat", temperature: 0.2 }
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("SIGNA: model did not return JSON.");
    const parsed = JSON.parse(jsonMatch[0]);

    const result: TacticalSuggestion = {
      recommendedAction: String(parsed.recommendedAction || "Perform standard diagnostic inspection."),
      rootCauseProbability: Array.isArray(parsed.rootCauseProbability) ? parsed.rootCauseProbability : [],
      historicalReference: historicalCases.map((c) => ({ reference: c.reference, date: c.date, outcome: c.outcome })),
      confidence: historicalCases.length > 0 ? (parsed.confidence || "MEDIUM") : "LOW",
    };

    await recordBrainInvocation(BRAIN_ID, {
      triggeredBy,
      inputSummary: `${vehicleModel}: ${complaint}`.slice(0, 500),
      outputSummary: result.recommendedAction.slice(0, 500),
      durationMs: Date.now() - startedAt,
    });

    return result;
  } catch (err: any) {
    await recordBrainError(BRAIN_ID, err.message, triggeredBy, Date.now() - startedAt);
    throw err;
  }
}

/**
 * Passive learning hook — call this when a real job card is closed
 * (Completed/Invoiced). Stores the real outcome for future SIGNA lookups.
 * Never called on unfinished or fabricated data.
 */
export async function learnFromClosedJobCard(jobCard: {
  job_card_no?: string;
  vehicle_model?: string;
  job_description?: string;
  remarks?: string;
  technician_name?: string;
  status?: string;
}): Promise<void> {
  if (!jobCard.vehicle_model || !(jobCard.job_description || jobCard.remarks)) return;
  try {
    await db.execute(
      `INSERT INTO ai_brain_memory (memory_id, vehicle_model, complaint_text, diagnosis, outcome, technician_name, job_card_ref, source_table)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'job_cards')`,
      [
        `MEM-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
        jobCard.vehicle_model,
        jobCard.job_description || "",
        jobCard.remarks || "",
        jobCard.status || "Completed",
        jobCard.technician_name || null,
        jobCard.job_card_no || null,
      ]
    );
  } catch (e: any) {
    console.warn("SIGNA: failed to learn from closed job card:", e.message);
  }
}
