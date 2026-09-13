/**
 * NVIDIA NIM — the single client for every AI call this application makes.
 *
 * WHY THIS EXISTS
 *
 * Gemini model ids were hardcoded across eighteen call sites, and when Google
 * retired them every one broke at once with a 404 nobody could act on. The
 * DeepSeek key was a placeholder that answered 401 on every request for months
 * without anyone noticing. Both failures were invisible because nothing checked
 * whether the provider could work before calling it.
 *
 * So: one place that knows the models, one place that knows whether we are
 * configured, and one function that makes the call.
 *
 * THE MODELS, each verified against the live catalogue with the deployed key:
 *
 *   nemotron-3.5-lightning-30b-a3b    text  — chat, reasoning, classification
 *   nemotron-parse-2.0                image — OCR, document and form reading
 *   nemotron-3-nano-omni-...-reasoning audio — speech transcription
 *
 * REASONING MODELS EMIT THEIR THINKING. The chat and omni models return a
 * `reasoning_content` field alongside `content`, and their prose sometimes opens
 * with a preamble like "Here's a thinking process...". Only `content` is
 * returned here — a user asking about bay occupancy should see the answer, not
 * the deliberation.
 */

const BASE_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

/** Text: chat, summarisation, classification, structured extraction from text. */
export const NEMOTRON_TEXT_MODEL =
  process.env.NEMOTRON_TEXT_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";

/** Vision: reading text out of photographs and scanned documents. */
export const NEMOTRON_VISION_MODEL =
  process.env.NEMOTRON_VISION_MODEL || "nvidia/nemotron-parse-2.0";

/** Audio: transcribing a spoken note. */
export const NEMOTRON_AUDIO_MODEL =
  process.env.NEMOTRON_AUDIO_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

/**
 * The configured key, or "" when there is nothing usable.
 *
 * A PLACEHOLDER IS NOT A KEY. NVIDIA_API_KEY was found set to the literal
 * "YOUR_N..." in this environment, and DEEPSEEK_API_KEY likewise. Accepting any
 * non-empty string is precisely how those dead paths stayed hidden: the code
 * believed it had a provider and failed on every call instead of skipping.
 * NVIDIA keys begin with "nvapi-"; anything else is refused here rather than
 * sent upstream to fail.
 */
function resolveKey(): string {
  const raw = (process.env.NEMOTRON_API_KEY || process.env.NVIDIA_API_KEY || "").trim();
  if (!raw) return "";
  if (/^(your[_-]|<|xxx|placeholder|changeme|todo)/i.test(raw)) return "";
  if (!raw.startsWith("nvapi-")) return "";
  return raw;
}

/** True when a usable key is present. Callers MUST check before calling. */
export function isNemotronConfigured(): boolean {
  return resolveKey().length > 0;
}

/**
 * A message part. Text, an image, or audio — the API takes all three in the
 * same `content` array.
 */
export type NemotronPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "audio_url"; audio_url: { url: string } };

export interface NemotronOptions {
  model?: string;
  system?: string;
  maxTokens?: number;
  /** Default 0: these calls read and classify. Creativity here is an error. */
  temperature?: number;
  timeoutMs?: number;
}

/**
 * Remove a reasoning model's deliberation if any leaks into the answer.
 *
 * WHAT WAS ACTUALLY WRONG. These models emit their reasoning FIRST, and it
 * counts against max_tokens. Measured against the live API with the same
 * question ("Bays: B01 occupied, B02 free, B03 free. Which bays are free?"):
 *
 *   max_tokens=120   finish=length  "Here's a thinking process:\n\n1. **Analyze..."
 *   max_tokens=400   finish=stop    "B02 and B03 are free."
 *   max_tokens=1200  finish=stop    "B02 and B03 are free."
 *
 * So the preamble was not the model misbehaving — the budget was too small and
 * the reply was cut off mid-thought before the answer was reached. The fix is
 * the token floor in callNemotron, not text surgery.
 *
 * This remains as a NARROW safety net for explicit <think> tags only. An
 * earlier version tried to cut prose preambles and made things worse: it kept
 * "Here's a thinking process:" and discarded the answer. Text that does not
 * carry an explicit tag is returned untouched — losing a real answer to an
 * over-eager filter is a worse failure than showing some thinking.
 */
function stripReasoning(text: string): string {
  // Explicit thinking tags only. Nothing heuristic.
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim() || text.trim();
}

/**
 * Call a Nemotron model and return the assistant's text.
 *
 * Throws on every failure — no key, non-2xx, unparseable body, empty answer —
 * so a caller can never mistake a failure for an empty result. The thrown
 * message carries the upstream status so the UI can say what actually went
 * wrong rather than blaming the nearest plausible cause.
 */
export async function callNemotron(
  parts: NemotronPart[] | string,
  opts: NemotronOptions = {}
): Promise<string> {
  const key = resolveKey();
  if (!key) {
    throw new Error(
      "AI is not configured — set NEMOTRON_API_KEY to a real NVIDIA key (it starts with 'nvapi-')."
    );
  }

  const model = opts.model || NEMOTRON_TEXT_MODEL;
  const timeoutMs = Number(opts.timeoutMs || process.env.NEMOTRON_TIMEOUT_MS || 45000); // realdata-allow: request timeout in ms, not displayed data

  const messages: any[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: parts });

  // A stalled upstream would otherwise hold the request open and the screen
  // would appear frozen with no explanation.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: opts.temperature ?? 0,
        // REASONING BUDGET. The model spends tokens thinking BEFORE it answers,
        // and that thinking counts against this limit. Measured: at 120 the
        // reply is truncated mid-thought and no answer is produced; at 400 it
        // answers cleanly. A caller asking for a short answer must still leave
        // room for the reasoning that precedes it, so the floor is enforced
        // here rather than trusted to every call site.
        max_tokens: Math.max(opts.maxTokens ?? 1024, 512),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Nemotron returned HTTP ${res.status}. ${body.slice(0, 200)}`.trim());
    }

    const data: any = await res.json().catch(() => null);
    // `content` only. reasoning_content is the model's private deliberation and
    // must never reach a workshop screen.
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) throw new Error("Nemotron returned an empty response.");
    return stripReasoning(text);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Nemotron did not respond within ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse a JSON object out of a model reply.
 *
 * Reasoning models wrap JSON in prose or fences even when told not to. Returns
 * null rather than throwing when nothing parseable is present, so a caller can
 * fall back to its deterministic path instead of failing the whole request.
 */
export function parseJsonReply<T = any>(reply: string): T | null {
  if (!reply) return null;
  const cleaned = reply.replace(/```json\s*|\s*```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
