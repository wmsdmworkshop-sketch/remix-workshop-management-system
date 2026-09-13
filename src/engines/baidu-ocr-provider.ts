/**
 * Baidu Unlimited-OCR — second opinion and validator for number-plate reads.
 *
 * WHY A SEPARATE SERVICE
 *
 * baidu/Unlimited-OCR is a 3B-parameter vision-language model published as
 * weights, not as a hosted API. Its Hugging Face page states plainly that it is
 * "not deployed by any Inference Provider", its metadata carries
 * inference: None, and it requires trust_remote_code. There is nothing to send
 * an image to and no API key to obtain — it has to be run somewhere.
 *
 * This app is Node on Cloud Run with no GPU, so the model cannot live in-process.
 * The provider below therefore talks to a SEPARATE inference service over HTTP,
 * which the owner supplies by setting BAIDU_OCR_ENDPOINT. Until that is set the
 * provider reports itself unconfigured and the pipeline skips it — it never
 * fabricates a result and never blocks a scan.
 *
 * THE CONTRACT
 *
 * POST <BAIDU_OCR_ENDPOINT>
 *   { "image_base64": "<no data: prefix>", "prompt": "<optional instruction>" }
 * ->
 *   { "text": "<all text read from the image>", "confidence": 0.0-1.0 }
 *
 * `confidence` is optional; when the service omits it this reports 0.9 and says
 * so rather than inventing precision. Any other shape is a failure, not a
 * silent empty read.
 *
 * WHERE IT SITS
 *
 * Azure Document Intelligence stays the primary engine — it is configured,
 * paid for and verified working. Baidu is the SECOND opinion: it runs when
 * Azure fails outright, and as a validator when Azure's text yields a
 * questionable registration number. That ordering is the owner's decision.
 */

export interface BaiduOcrResponse {
  text: string;
  confidence: number;
}

/** True when an endpoint has been supplied. Nothing is attempted without one. */
export function isBaiduOcrConfigured(): boolean {
  return Boolean((process.env.BAIDU_OCR_ENDPOINT || "").trim());
}

/**
 * Read an image through the Baidu inference service.
 *
 * Throws on any failure — an unreachable service, a non-2xx reply, an
 * unrecognised body, or empty text. The caller decides what to do about it;
 * this never returns a made-up value.
 */
export async function readWithBaiduOcr(
  imageBase64: string,
  prompt?: string
): Promise<BaiduOcrResponse> {
  const endpoint = (process.env.BAIDU_OCR_ENDPOINT || "").trim();
  if (!endpoint) {
    throw new Error("BAIDU_OCR_ENDPOINT is not set — the Baidu OCR service is not configured.");
  }

  const token = (process.env.BAIDU_OCR_TOKEN || "").trim();
  const timeoutMs = Number(process.env.BAIDU_OCR_TIMEOUT_MS || 30000); // realdata-allow: request timeout in ms, not displayed data

  // A 3B vision model is slow; without a bound a stalled service would hold the
  // request open and the gate-in screen would appear frozen.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        image_base64: imageBase64.replace(/^data:image\/[^;]+;base64,/i, ""),
        prompt: prompt || "Read every character visible in this image, preserving line breaks.",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Baidu OCR service returned HTTP ${res.status}. ${body.slice(0, 160)}`.trim());
    }

    const data: any = await res.json().catch(() => null);
    const text = String(data?.text ?? "").trim();
    if (!text) {
      throw new Error("Baidu OCR service returned no text.");
    }

    // Report the service's own confidence when it gives one. 0.9 is a stated
    // default for a service that does not, not a measurement.
    const raw = Number(data?.confidence);
    const confidence = Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.9;

    return { text, confidence };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(`Baidu OCR service did not respond within ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
