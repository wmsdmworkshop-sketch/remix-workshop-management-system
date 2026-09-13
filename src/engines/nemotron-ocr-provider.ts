/**
 * NVIDIA Nemotron Parse 2.0 — second opinion and validator for OCR reads.
 *
 * Model id `nvidia/nemotron-parse-2.0`, confirmed present in NVIDIA's live NIM
 * catalogue (GET https://integrate.api.nvidia.com/v1/models). Unlike a weights-
 * only model this is a HOSTED API, so it needs a key and nothing else — no GPU
 * to provision and no service to operate.
 *
 * WHERE IT SITS
 *
 * Azure Document Intelligence stays PRIMARY: it is configured, paid for, and
 * verified working against this project's own endpoint. Nemotron is the second
 * option — it runs when Azure fails outright, and as a validator when Azure's
 * text yields a questionable registration number.
 *
 * WHY A SECOND READER AT ALL
 *
 * Azure frequently misreads painted and stencilled Indian commercial plates
 * ("KA 32 AB0307" read as "KA 03 0002"), and the regex parser then matches the
 * wrong pattern confidently. A second reader working from the IMAGE — not from
 * Azure's text, which would inherit the same mistake — is what catches that.
 *
 * UNCONFIGURED IS NOT BROKEN
 *
 * Every entry point checks isNemotronOcrConfigured() first. Without
 * NEMOTRON_API_KEY the pipeline behaves exactly as Azure-only: the step is
 * skipped, not attempted and failed. That is deliberate — the Gemini and
 * DeepSeek paths this replaces failed silently on every scan for months because
 * nothing checked whether they could work.
 */

export interface NemotronOcrResponse {
  text: string;
  confidence: number;
}

const DEFAULT_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "nvidia/nemotron-parse-2.0";

/**
 * The configured key, or "" when there is nothing usable.
 *
 * A PLACEHOLDER IS NOT A KEY. NVIDIA_API_KEY was found set to the literal
 * "YOUR_N..." in this environment, and DEEPSEEK_API_KEY is likewise a
 * placeholder that answered 401 on every request for months. Treating any
 * non-empty string as configured is how those dead paths stayed invisible —
 * the pipeline believed it had a fallback and failed on every scan instead of
 * skipping cleanly.
 *
 * NVIDIA keys begin with "nvapi-". Anything else is rejected here rather than
 * sent upstream to fail.
 */
function resolveKey(): string {
  const raw = (process.env.NEMOTRON_API_KEY || process.env.NVIDIA_API_KEY || "").trim();
  if (!raw) return "";
  if (/^(your[_-]|<|xxx|placeholder|changeme|todo)/i.test(raw)) return "";
  if (!raw.startsWith("nvapi-")) return "";
  return raw;
}

/** True when a usable key is present. Nothing is attempted without one. */
export function isNemotronOcrConfigured(): boolean {
  return resolveKey().length > 0;
}

/**
 * Read an image through Nemotron Parse.
 *
 * Throws on any failure — missing key, non-2xx, unreadable body, or empty text.
 * It never returns a fabricated value; the caller decides what to do with a
 * failure.
 */
export async function readWithNemotronOcr(
  imageBase64: string,
  prompt?: string
): Promise<NemotronOcrResponse> {
  const key = resolveKey();
  if (!key) {
    throw new Error(
      "Nemotron OCR is not configured — set NEMOTRON_API_KEY to a real NVIDIA key (it starts with 'nvapi-')."
    );
  }

  const endpoint = (process.env.NEMOTRON_OCR_ENDPOINT || DEFAULT_ENDPOINT).trim();
  const model = (process.env.NEMOTRON_OCR_MODEL || DEFAULT_MODEL).trim();
  const timeoutMs = Number(process.env.NEMOTRON_OCR_TIMEOUT_MS || 30000); // realdata-allow: request timeout in ms, not displayed data

  // A stalled upstream would otherwise hold the gate-in request open and the
  // screen would appear frozen.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const base64 = imageBase64.replace(/^data:image\/[^;]+;base64,/i, "");

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  prompt ||
                  "Read every character visible in this image exactly as printed, preserving line breaks. Return only the text.",
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
        // Reading, not composing: any creativity here is a misread.
        temperature: 0,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Nemotron OCR returned HTTP ${res.status}. ${body.slice(0, 200)}`.trim());
    }

    const data: any = await res.json().catch(() => null);
    const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) {
      throw new Error("Nemotron OCR returned no text.");
    }

    // The API reports no per-read confidence. 0.9 is a STATED default for a
    // successful read, not a measurement — the caller must not treat it as one.
    return { text, confidence: 0.9 };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Nemotron OCR did not respond within ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
